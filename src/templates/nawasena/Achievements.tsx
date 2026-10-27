// Prestasi (kunci `achievements`), pita abu kertas: kepala section, tombol persegi sebelumnya/berikutnya rata kanan tepat
// di atas rel (aria-disabled di ujung rel), lalu rel kartu yang bisa digeser dengan scroll-snap. Kartu putih radius 8:
// tahun · tingkat (mono), peringkat serif besar, lomba, nama murid/tim, dan label bidang di dasar kartu. Muncul sebagai
// satu rel (<Reveal> di rel, bukan per kartu). HP: kartu 82% lebar, tombol rata kiri di bawah rel.
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { useMotionEnabled } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { useRailEdges } from './hooks';
import type { NawasenaModel } from './model';
import { C, CARD, DISPLAY, SECTION_PAD, SQUARE, TYPE_N } from './styles';
import { SectionHead } from './ui';

export function Achievements({ m }: { m: NawasenaModel }) {
  const { achievements } = m;
  const items = m.items('achievements');
  const rail = useRef<HTMLUListElement>(null);
  const { atStart, atEnd } = useRailEdges(rail);
  const motion = useMotionEnabled();
  if (items.length === 0) return null;

  /** Geser satu kartu (lebar kartu pertama + jarak). */
  const move = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: motion ? 'smooth' : 'auto' });
  };

  const controls = (
    <div className="flex shrink-0 gap-2">
      <button type="button" onClick={() => move(-1)} aria-label="Prestasi sebelumnya" aria-disabled={atStart || undefined} className={`${SQUARE.light} ${atStart ? 'opacity-40' : ''}`}>
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button type="button" onClick={() => move(1)} aria-label="Prestasi berikutnya" aria-disabled={atEnd || undefined} className={`${SQUARE.light} ${atEnd ? 'opacity-40' : ''}`}>
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );

  return (
    <TemplateSection sectionKey="achievements" className={`${C.surface} ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(achievements, 'eyebrow')}
          number={m.number('achievements')}
          title={text(achievements, 'title') || 'Prestasi'}
          subtitle={text(achievements, 'subtitle')}
        />
        {/* Tablet & layar lebar: tombol di baris sendiri tepat di atas rel, rata kanan (kepala section tetap rata) */}
        <div className="mt-10 hidden justify-end @3xl:flex">{controls}</div>
        <Reveal className="mt-10 @3xl:mt-4">
          <ul
            ref={rail}
            aria-label={text(achievements, 'title') || 'Daftar prestasi'}
            className="nw-rail -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-1 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:-mx-12 @5xl:scroll-px-12 @5xl:px-12 @min-[96rem]:-mx-16 @min-[96rem]:scroll-px-16 @min-[96rem]:px-16"
          >
            {items.map((item, i) => {
              const meta = [field(item, 'year'), field(item, 'level')].filter(Boolean).join(' · ');
              const category = field(item, 'category');
              return (
                <li key={`${field(item, 'event')}-${i}`} className={`flex w-[82%] shrink-0 snap-start flex-col p-6 @xl:w-[340px] @5xl:p-7 ${CARD.white}`}>
                  {meta && <p className={`${TYPE_N.mono} ${C.muted}`}>{meta}</p>}
                  {field(item, 'title') && (
                    <p className={`mt-4 text-[36px] leading-none text-(--nw-navy) ${DISPLAY} font-normal @3xl:text-[40px]`}>{field(item, 'title')}</p>
                  )}
                  {field(item, 'event') && <h3 className={`mt-4 text-[17px] font-semibold leading-snug ${C.navy}`}>{field(item, 'event')}</h3>}
                  {field(item, 'name') && <p className={`mt-2 text-[14.5px] leading-snug ${C.muted}`}>{field(item, 'name')}</p>}
                  {category && (
                    <p className="mt-auto pt-6">
                      <span className="inline-flex h-6 items-center rounded-[4px] bg-(--nw-tint) px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-(--nw-ink)">
                        {category}
                      </span>
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Reveal>
        {/* HP: rata kiri, jauh dari tombol WhatsApp & kembali-ke-atas yang melayang di kanan bawah */}
        <div className="mt-5 flex justify-start @3xl:hidden">{controls}</div>
      </div>
    </TemplateSection>
  );
}
