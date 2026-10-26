// Jajaran model (`lineup`): panel gelap membulat di dalam gutter. Kepala: label + judul putih + deskripsi kiri, tombol
// filter kanan (dibuat dari kolom "Kategori" model; benar-benar menyaring, kartu memudar masuk). Kartu grafit radius 20:
// foto 4:3 dengan chip panah aksen, nama, kalimat singkat, harga, dan tiga spesifikasi. HP: filter jadi rel geser, kartu
// satu kolom. Jumlah model yang tampil diumumkan ke pembaca layar.
import { ArrowUpRight } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { filterModels, lineupFilters, modelCategories, type VeloraModel } from './model';
import { VELORA_PHOTOS } from './photos';
import { DISPLAY, GUTTER, INSET } from './styles';
import { ArrowPill, SectionHead } from './ui';

export function Lineup({ m }: { m: VeloraModel }) {
  const s = m.lineup;
  const items = m.items('lineup');
  const filters = lineupFilters(items);
  const [current, setCurrent] = useState<string | null>(null);
  // Kartu memudar masuk hanya setelah filter diganti (saat dimuat: muncul bersama wadahnya lewat Reveal)
  const [changed, setChanged] = useState(false);
  const statusId = useId();
  const active = current && filters.includes(current) ? current : null;
  const shownItems = filterModels(items, active);
  const allLabel = text(s, 'all_label') || 'All';
  const buttonAction = m.linkOr(text(s, 'button_url'), m.driveAction);
  const fallbackAction = m.driveAction;

  const chips =
    filters.length > 1 ? (
      <div role="group" aria-label="Filter models" className="vl-rail -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-1 @5xl:mx-0 @5xl:flex-wrap @5xl:overflow-visible @5xl:px-0 @6xl:justify-end">
        {[null, ...filters].map((f) => {
          const on = f === active;
          return (
            <button
              key={f ?? '__all'}
              type="button"
              aria-pressed={on}
              aria-describedby={statusId}
              onClick={() => {
                setCurrent(f);
                setChanged(true);
              }}
              className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-medium transition-colors duration-300 ${
                on ? 'bg-white text-[#0D0E10]' : 'bg-white/[0.07] text-white/80 ring-1 ring-inset ring-white/12 hover:bg-white/[0.14] hover:text-white'
              }`}
            >
              {f ?? allLabel}
            </button>
          );
        })}
      </div>
    ) : null;

  return (
    <TemplateSection sectionKey="lineup" data-tpl-tone="inverse" className="py-2 @3xl:py-3">
      <div className={GUTTER}>
        <div className={`rounded-[24px] bg-[#0D0E10] py-14 text-white @3xl:py-20 @5xl:rounded-[28px] @5xl:py-24 ${INSET}`}>
          <div className="grid gap-7 @6xl:grid-cols-12 @6xl:items-end @6xl:gap-10">
            <SectionHead layout="stack" eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} tone="dark" className="min-w-0 @6xl:col-span-7" />
            {chips && (
              <Reveal delay={200} className="min-w-0 @6xl:col-span-5">
                {chips}
              </Reveal>
            )}
          </div>
          <p id={statusId} className="sr-only" aria-live="polite">
            {`Showing ${shownItems.length} of ${items.length} models${active ? `: ${active}` : ''}`}
          </p>

          <Reveal as="ul" key={active ?? '__all'} className="mt-10 grid gap-3 @2xl:grid-cols-2 @3xl:mt-14 @3xl:gap-4 @6xl:grid-cols-3">
            {shownItems.map((item, i) => {
              const name = field(item, 'name');
              const image = field(item, 'image');
              const specs = ['spec_1', 'spec_2', 'spec_3'].map((k) => field(item, k)).filter(Boolean);
              const action = m.linkOr(field(item, 'url'), fallbackAction);
              const categories = modelCategories(item);
              const body = (
                <>
                  <KitPhoto
                    src={image}
                    alt={VELORA_PHOTOS.alt(image, name)}
                    sizes="(min-width: 1152px) 30vw, (min-width: 672px) 46vw, 92vw"
                    className="aspect-[4/3] rounded-[14px]"
                    imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                  >
                    {categories.length > 0 && (
                      <span className="absolute left-3 top-3 flex flex-wrap gap-1.5">
                        {categories.slice(0, 2).map((c) => (
                          <span key={c} className="rounded-full bg-[#0D0E10]/75 px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-md">
                            {c}
                          </span>
                        ))}
                      </span>
                    )}
                    {action && (
                      <span aria-hidden className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-(--vl-red) text-(--vl-on-red)">
                        <ArrowUpRight className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </span>
                    )}
                  </KitPhoto>
                  <span className="flex flex-1 flex-col px-2.5 pb-2 pt-5 @3xl:px-3">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className={`${DISPLAY} text-[22px] font-medium leading-tight tracking-[-0.02em] text-white @3xl:text-[24px]`}>{name}</span>
                      {field(item, 'price') && <span className="text-[14px] font-medium tabular-nums text-white/85">{field(item, 'price')}</span>}
                    </span>
                    {field(item, 'tagline') && <span className="mt-1.5 block text-[14.5px] leading-snug text-white/70">{field(item, 'tagline')}</span>}
                    {specs.length > 0 && (
                      <span className="mt-auto block pt-5">
                        <span className="flex flex-wrap gap-1.5 border-t border-white/10 pt-4">
                          {specs.map((spec, k) => (
                            <span key={`${spec}-${k}`} className="max-w-full truncate whitespace-nowrap rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] leading-none text-white/85 ring-1 ring-inset ring-white/[0.08]">
                              {spec}
                            </span>
                          ))}
                        </span>
                      </span>
                    )}
                  </span>
                </>
              );
              const box = 'group flex h-full flex-col rounded-[20px] bg-[#1B1D21] p-2 ring-1 ring-inset ring-white/[0.06] transition-colors duration-300';
              return (
                <li key={`${name}-${i}`} className={`min-w-0 ${changed ? 'vl-fade-in' : ''}`} style={{ '--vl-delay': `${Math.min(i, 5) * 60}ms` } as CSSProperties}>
                  {action ? (
                    <ActionLink action={action} className={`${box} hover:bg-[#23262B]`}>
                      {body}
                    </ActionLink>
                  ) : (
                    <div className={box}>{body}</div>
                  )}
                </li>
              );
            })}
          </Reveal>

          {text(s, 'button_label') && buttonAction && (
            <div className="mt-10 flex justify-center @3xl:mt-12">
              <ArrowPill action={buttonAction} label={text(s, 'button_label')} variant="white" className="w-full @xl:w-auto" />
            </div>
          )}
        </div>
      </div>
    </TemplateSection>
  );
}
