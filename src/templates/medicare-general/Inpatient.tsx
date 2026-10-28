// Rawat inap (kunci `inpatient`), latar putih. Kepala section, lalu TAB per kelas kamar (role="tablist", panah kiri/kanan,
// Home/End; garis bawah 3px warna tema pada tab aktif; di HP rel tab digulir di dalam kotaknya sendiri), panel: foto
// kamar 3:2 radius 12 (7 kolom) + nama kelas, kapasitas, dan fasilitas bertanda centang (5 kolom). Di bawahnya kartu
// kertas "Jam besuk" (ikon jam, jam besuk besar, aturan bertanda centang). Panel memudar singkat saat berganti
// (./medicare-general.css .mc-panel).
import { Clock, Users } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { splitTags, type MedicareModel } from './model';
import { MEDICARE_PHOTOS } from './photos';
import { C, GRID_GAP, SECTION_PAD, T } from './styles';
import { CheckList, SectionHead } from './ui';

export function Inpatient({ m }: { m: MedicareModel }) {
  const { inpatient } = m;
  const rooms = m.items('inpatient');
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, rooms.length - 1);
  const room = rooms[index];
  const rules = list(inpatient, 'visiting_rules', 4)
    .map((item) => field(item, 'text'))
    .filter(Boolean);
  const visitingTitle = text(inpatient, 'visiting_title');
  const visitingHours = text(inpatient, 'visiting_hours');

  const select = (i: number) => {
    const next = (i + rooms.length) % rooms.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: rooms.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    select(keys[e.key]);
  };

  const image = room ? field(room, 'image') : '';
  const facilities = room ? splitTags(field(room, 'facilities')) : [];
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;

  return (
    <TemplateSection sectionKey="inpatient" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(inpatient, 'eyebrow')} title={text(inpatient, 'title')} subtitle={text(inpatient, 'subtitle')} srTitle="Rawat inap" />

        <Reveal className="mt-10 @3xl:mt-12">
          {rooms.length > 1 && (
            <div className={`mc-rail -mx-5 overflow-x-auto border-b px-5 @2xl:-mx-8 @2xl:px-8 @3xl:mx-0 @3xl:px-0 ${C.line}`}>
              <div role="tablist" aria-label="Kelas kamar" onKeyDown={onKeyDown} className="flex min-w-max gap-1 @3xl:gap-2">
                {rooms.map((r, i) => {
                  const selected = i === index;
                  return (
                    <button
                      key={`${field(r, 'name')}-${i}`}
                      ref={(el) => {
                        tabRefs.current[i] = el;
                      }}
                      id={tabId(i)}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      aria-controls={panelId}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActive(i)}
                      className={`relative min-h-14 whitespace-nowrap px-4 font-bold transition-colors duration-200 after:absolute after:inset-x-2 after:-bottom-px after:h-[3px] after:rounded-full after:transition-colors @3xl:px-6 ${T.body} ${
                        selected ? `${C.ink} after:bg-(--tpl-accent)` : 'text-[#46566B] after:bg-transparent hover:text-(--tpl-accent-ink)'
                      }`}
                    >
                      {field(r, 'name')}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {room && (
            <div
              key={index}
              id={panelId}
              role={rooms.length > 1 ? 'tabpanel' : undefined}
              aria-labelledby={rooms.length > 1 ? tabId(index) : undefined}
              className={`mc-panel grid grid-cols-1 gap-y-8 pt-8 @3xl:pt-10 @5xl:grid-cols-12 @5xl:items-center ${GRID_GAP}`}
            >
              {hasImage(image) && (
                <KitPhoto
                  src={image}
                  alt={MEDICARE_PHOTOS.alt(image, `Kamar rawat inap ${field(room, 'name')} di ${m.companyName}`)}
                  fallback="none"
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="aspect-[3/2] rounded-[12px] @5xl:col-span-7"
                />
              )}
              <div className={`min-w-0 ${hasImage(image) ? '@5xl:col-span-5' : '@5xl:col-span-12'}`}>
                <h3 className={`${T.h2} ${C.ink}`}>{field(room, 'name')}</h3>
                {field(room, 'capacity') && (
                  <p className={`mt-3 flex items-center gap-2.5 font-semibold ${T.body} text-(--tpl-accent-ink)`}>
                    <Users aria-hidden className="h-5 w-5 shrink-0" />
                    {field(room, 'capacity')}
                  </p>
                )}
                <CheckList items={facilities} label={`Fasilitas kamar ${field(room, 'name')}`} className="mt-6" />
              </div>
            </div>
          )}
        </Reveal>

        {(visitingHours || rules.length > 0) && (
          <Reveal className={`mt-12 grid gap-6 rounded-[12px] p-6 @3xl:mt-16 @3xl:p-8 @5xl:grid-cols-12 @5xl:items-start ${C.paper}`}>
            <div className="flex min-w-0 items-start gap-4 @5xl:col-span-5">
              <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] bg-white text-(--tpl-accent-ink) ring-1 ring-inset ring-[#0E1B2E]/[0.1]">
                <Clock className="h-7 w-7" strokeWidth={1.75} />
              </span>
              <div className="min-w-0">
                <h3 className={`${T.h3} ${C.ink}`}>{visitingTitle || 'Jam besuk'}</h3>
                {visitingHours && <p className={`mt-1 ${T.lead} font-semibold ${C.ink}`}>{visitingHours}</p>}
              </div>
            </div>
            <CheckList items={rules} label="Aturan besuk" className="@5xl:col-span-7" />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}
