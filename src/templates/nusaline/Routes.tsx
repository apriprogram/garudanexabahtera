// Rute & titik naik (kunci `routes`), putih. Kepala section, lalu DIAGRAM JALUR: garis warna tema (SVG, tumbuh dari
// titik pertama sekali saat terlihat) dengan titik-titik kota sebagai tab (role=tablist; panah kiri/kanan/atas/bawah, Home/End) —
// layar lebar mendatar selebar wadah, HP tegak. Kota pertama terpilih. Panel kota: foto kota 4:3 (opsional) + daftar
// agen (nama, alamat, jam buka mono) bergaris rambut, catatan kecil, dan tautan "Tanya titik naik" ke WhatsApp berisi
// nama kota. Alamat & jam agen di demo contoh.
import { Clock3, MapPin } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pointsCount, pointsMessage, type NusalineModel } from './model';
import { NUSALINE_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, LABEL, LABEL_SM, MONO, SECTION_PAD, TYPE, WRAP } from './styles';
import { SectionHead, TextLink } from './ui';

export function Routes({ m }: { m: NusalineModel }) {
  const { routes } = m;
  const stops = m.stops;
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, stops.length - 1);
  const stop = stops[index];
  if (!stop) return null;
  const tabId = (i: number) => `${baseId}-stop-${i}`;
  const panelId = `${baseId}-panel`;
  const note = text(routes, 'note');
  const ask = text(routes, 'link_label') ? m.waWith(pointsMessage(stop.city, m.companyName)) : null;
  const photo = hasImage(stop.image);
  const many = stops.length > 1;

  const select = (i: number) => {
    const next = (i + stops.length) % stops.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: stops.length - 1,
    };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <TemplateSection sectionKey="routes" className={`bg-white ${SECTION_PAD}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(routes, 'eyebrow')} title={text(routes, 'title')} subtitle={text(routes, 'subtitle')} srTitle="Rute dan titik naik" />

        {many && (
          <Reveal className="nl-route mt-10 @3xl:mt-14">
            <div
              role="tablist"
              aria-label="Pilih kota"
              onKeyDown={onKeyDown}
              className="relative grid grid-cols-1 @3xl:grid-cols-[repeat(var(--nl-n),minmax(0,1fr))]"
              style={{ '--nl-n': stops.length } as CSSProperties}
            >
              {/* Garis jalur (dekoratif): HP tegak di kiri, layar lebar mendatar dari titik pertama ke terakhir */}
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="nl-route-svg pointer-events-none absolute left-[8px] top-[28px] h-[calc(100%-56px)] w-[3px] overflow-visible @3xl:left-[calc(50%/var(--nl-n))] @3xl:top-[16px] @3xl:h-[3px] @3xl:w-[calc(100%-100%/var(--nl-n))]"
              >
                <line className="@3xl:hidden" x1="50" y1="0" x2="50" y2="100" stroke="var(--tpl-accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                <line className="hidden @3xl:block" x1="0" y1="50" x2="100" y2="50" stroke="var(--tpl-accent)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              </svg>
              {stops.map((s, i) => {
                const selected = i === index;
                return (
                  <button
                    key={`${s.city}-${i}`}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    id={tabId(i)}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={panelId}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    className="group relative flex min-h-14 items-center gap-4 py-2.5 text-left @3xl:flex-col @3xl:items-center @3xl:gap-3 @3xl:py-0 @3xl:text-center"
                  >
                    <span
                      aria-hidden
                      className={`nl-stop-dot relative z-10 h-[19px] w-[19px] shrink-0 rounded-full transition-colors duration-200 @3xl:mt-[7px] ${
                        selected ? 'bg-(--tpl-accent) ring-[5px] ring-(--tpl-accent)/20' : 'bg-white ring-[3px] ring-inset ring-(--tpl-accent) group-hover:bg-(--tpl-accent-100)'
                      }`}
                      style={{ '--nl-i': i } as CSSProperties}
                    />
                    <span className="min-w-0">
                      <span className={`block ${DISPLAY} text-[18px] font-bold leading-tight ${selected ? C.accent : C.ink} @5xl:text-[20px]`}>{s.city}</span>
                      <span className={`mt-0.5 block ${LABEL_SM} ${C.muted}`}>
                        {s.code} · {pointsCount(s.points.length)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        )}

        <div
          key={index}
          id={panelId}
          role={many ? 'tabpanel' : undefined}
          aria-labelledby={many ? tabId(index) : undefined}
          className={`nl-panel mt-8 grid gap-y-6 @3xl:mt-12 ${photo ? `@5xl:grid-cols-12 ${GRID_GAP}` : ''}`}
        >
          {photo && (
            <KitPhoto
              src={stop.image}
              alt={NUSALINE_PHOTOS.alt(stop.image, `Suasana kota ${stop.city}`)}
              sizes="(min-width: 1024px) 40vw, 100vw"
              fallback="none"
              className="aspect-[4/3] rounded-[18px] @5xl:col-span-5"
            >
              <span className={`absolute left-3 top-3 rounded-full bg-[#0B1026]/70 px-3 py-1.5 text-white backdrop-blur-md ${LABEL_SM}`}>{stop.code}</span>
            </KitPhoto>
          )}
          <div className={`min-w-0 ${photo ? '@5xl:col-span-7' : ''}`}>
            <p className={`${LABEL} ${C.accent}`}>Titik naik</p>
            <h3 className={`mt-2 ${TYPE.h3lg} ${C.ink}`}>{stop.city}</h3>
            {stop.points.length > 0 ? (
              <ul className={`mt-5 divide-y border-y ${C.line} ${C.divide}`}>
                {stop.points.map((p, i) => (
                  <li key={`${p.name}-${i}`} className="grid gap-x-6 gap-y-1.5 py-4 @3xl:grid-cols-[minmax(0,1fr)_auto] @3xl:items-start">
                    <div className="min-w-0">
                      <p className={`text-[16px] font-semibold ${C.ink}`}>{p.name}</p>
                      {p.address && (
                        <p className={`mt-1 flex items-start gap-2 text-[15px] leading-snug ${C.muted}`}>
                          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} />
                          {p.address}
                        </p>
                      )}
                    </div>
                    {p.hours && (
                      <p className={`inline-flex w-fit items-center gap-1.5 self-start rounded-full bg-[#F2F4FA] px-3 py-1.5 ${MONO} text-[13px] font-medium ${C.ink}`}>
                        <Clock3 aria-hidden className="h-3.5 w-3.5 text-(--nl-ink)" strokeWidth={2} />
                        <span className="sr-only">Jam buka </span>
                        {p.hours}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={`mt-4 text-[15px] ${C.muted}`}>Titik naik di kota ini dikonfirmasi admin lewat WhatsApp.</p>
            )}
            {note && <p className={`mt-4 text-[13px] ${C.muted}`}>{note}</p>}
            <TextLink action={ask} label={text(routes, 'link_label')} ariaLabel={`${text(routes, 'link_label')} di ${stop.city} (WhatsApp)`} className="mt-3" />
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
