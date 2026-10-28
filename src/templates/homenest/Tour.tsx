// Tur virtual (kunci `tour`): pita HIJAU TUA selebar layar (data-tpl-tone="inverse"). Layar lebar: kolom 1-4 label, H2,
// kalimat pengantar, dan daftar ruang sebagai TAB tegak bernomor ("01 Ruang keluarga"; panah atas/bawah/kiri/kanan,
// Home/End); kolom 5-12 foto ruang 3:2 besar (berganti dengan pudar ≤ 300 ms) dengan tombol putar bundar krem di
// tengah yang membuka tautan tur virtual dari CMS di tab baru, lalu keterangan ruang dan catatan kecil. HP: judul, foto
// 4:3, keterangan, lalu tab 2×2. JUJUR: tidak ada tur 360° bawaan — tombol hanya membuka tautan milik pembeli; tanpa tautan,
// tombol disembunyikan dan foto ruang tetap bisa dijelajahi.
import { Play } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, text, type LinkAction } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { pad2, type HomeNestModel } from './model';
import { HOMENEST_PHOTOS } from './photos';
import { C, GRID_GAP, LABEL_SM, NUM, SECTION_PAD, SERIF } from './styles';
import { SectionHead } from './ui';

export function Tour({ m }: { m: HomeNestModel }) {
  const { tour } = m;
  const rooms = m.items('tour');
  const baseId = useId();
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.min(active, rooms.length - 1);
  const room = rooms[index];
  const tourUrl = text(tour, 'url');
  const play: LinkAction | null = tourUrl ? m.linkOr(tourUrl, null) : null;
  const playLabel = text(tour, 'button_label') || 'Buka tur virtual';
  const note = text(tour, 'note');
  const tabId = (i: number) => `${baseId}-tab-${i}`;
  const panelId = `${baseId}-panel`;

  const select = (i: number) => {
    const next = (i + rooms.length) % rooms.length;
    setActive(next);
    tabs.current[next]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: rooms.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(moves[e.key]);
  };

  return (
    <TemplateSection sectionKey="tour" data-tpl-tone="inverse" className={`${SECTION_PAD} ${C.deep} text-[#F4EFE4]`}>
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 ${GRID_GAP}`}>
        {/* HP: kolom kiri "contents" → urutan judul, foto, lalu tab ruang (order); layar lebar: judul + tab di kolom 1-4 */}
        <div className="contents @5xl:col-span-4 @5xl:flex @5xl:min-w-0 @5xl:flex-col">
          <SectionHead layout="stack" tone="dark" eyebrow={text(tour, 'eyebrow')} title={text(tour, 'title')} subtitle={text(tour, 'subtitle')} srTitle="Tur virtual" className="order-1 min-w-0 @5xl:order-none" />
          {rooms.length > 1 && (
            <Reveal delay={160} className="order-3 mt-8 min-w-0 @5xl:order-none @5xl:mt-auto @5xl:pt-12">
              <div role="tablist" aria-label="Pilih ruang" onKeyDown={onKeyDown} className="grid grid-cols-2 border-t border-[#F4EFE4]/15 @5xl:grid-cols-1">
                {rooms.map((r, i) => {
                  const selected = i === index;
                  return (
                    <button
                      key={`${field(r, 'name')}-${i}`}
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
                      className={`relative flex min-h-14 min-w-0 items-center gap-3 border-b border-[#F4EFE4]/15 py-3 pr-3 text-left transition-colors duration-200 @5xl:min-h-16 ${
                        i % 2 === 1 ? 'pl-4 border-l @5xl:border-l-0 @5xl:pl-0' : ''
                      } ${selected ? 'text-[#F4EFE4]' : 'text-[#F4EFE4]/[0.72] hover:text-[#F4EFE4]'}`}
                    >
                      <span aria-hidden className={`${LABEL_SM} ${NUM} ${selected ? 'text-[#F4EFE4]' : 'text-[#F4EFE4]/[0.72]'}`}>
                        {pad2(i + 1)}
                      </span>
                      <span className={`min-w-0 ${SERIF} text-[20px] font-medium leading-tight @5xl:text-[24px]`}>{field(r, 'name') || `Ruang ${i + 1}`}</span>
                      {/* Garis ruang aktif (dekoratif) */}
                      <span aria-hidden className={`hn-tab-bar absolute bottom-[-1px] left-0 h-px w-full bg-[#F4EFE4]`} data-on={selected ? "true" : "false"} />
                    </button>
                  );
                })}
              </div>
            </Reveal>
          )}
        </div>

        <Reveal delay={120} className="order-2 mt-10 min-w-0 @5xl:order-none @5xl:col-span-8 @5xl:mt-0">
          <div id={panelId} role={rooms.length > 1 ? 'tabpanel' : undefined} aria-labelledby={rooms.length > 1 ? tabId(index) : undefined}>
            <div className="relative aspect-[4/3] overflow-hidden bg-[#F4EFE4]/10 @3xl:aspect-[3/2]">
              {rooms.map((r, i) => (
                <div key={`${field(r, 'image')}-${i}`} aria-hidden={i === index ? undefined : true} data-active={i === index ? 'true' : 'false'} className="hn-tour-img absolute inset-0">
                  <KitPhoto
                    src={field(r, 'image')}
                    alt={i === index ? HOMENEST_PHOTOS.alt(field(r, 'image'), `Foto ${field(r, 'name') || 'ruang'}`) : ''}
                    sizes="(min-width: 1024px) 62vw, 100vw"
                    fallback="none"
                    className="absolute inset-0"
                  />
                </div>
              ))}
              {play && (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_50%,rgb(14_22_18/0.38),transparent_60%)]">
                  <ActionLink action={play} className="group/play flex flex-col items-center gap-3 text-[#FBF9F4]">
                    <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F4EFE4] text-(--hn-ink) transition-colors duration-200 group-hover/play:bg-white @3xl:h-24 @3xl:w-24">
                      <Play aria-hidden className="h-7 w-7 translate-x-0.5 fill-current" strokeWidth={1.4} />
                    </span>
                    <span className={`bg-[#0E1612]/60 px-3 py-1.5 ${LABEL_SM}`}>{playLabel}</span>
                  </ActionLink>
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
              {room && (
                <p className="min-w-0 text-[15px] leading-snug">
                  <span className={`${SERIF} text-[20px] font-medium text-[#F4EFE4]`}>{field(room, 'name')}</span>
                  {field(room, 'caption') && <span className={`ml-3 ${C.onDeepMuted}`}>{field(room, 'caption')}</span>}
                </p>
              )}
              {note && <p className={`text-[13px] ${C.onDeepMuted}`}>{note}</p>}
            </div>
          </div>
        </Reveal>
      </div>
    </TemplateSection>
  );
}


