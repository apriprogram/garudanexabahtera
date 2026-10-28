// Tur kamar bersalin (kunci `tour`): kepala section rata kiri; kanan jadwal tur (doodle kalender) + tombol "Jadwalkan
// tur" → WhatsApp berisi pesan dari CMS. Di bawahnya REL FOTO yang bisa digeser (scroll-snap): foto ruangan tegak 4:5
// radius 28 dengan nomor bulat pastel + nama ruangan di bawahnya. Tombol bulat "Foto sebelumnya/berikutnya" menggeser
// satu foto (aria-controls, nonaktif di ujung); rel bisa difokus dan digeser dengan tombol panah. HP: rel menembus
// tepi layar, foto ± 78% lebar. Seluruh rel muncul sekali (Reveal di rel, bukan per foto).
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { usePrefersReducedMotion } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { Doodle } from './art';
import type { MomkidModel } from './model';
import { MOMKID_PHOTOS } from './photos';
import { C, DISPLAY, GRID_GAP, PASTELS, SECTION_PAD, TONE_BG } from './styles';
import { ButtonLink, SectionHead } from './ui';

const ROUND = `flex h-11 w-11 items-center justify-center rounded-full bg-[#DDF3EA] text-[#2E2228] transition-colors duration-200 hover:bg-[#C6E9DA] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-[#DDF3EA]`;

export function Tour({ m }: { m: MomkidModel }) {
  const { tour } = m;
  const items = m.items('tour');
  const railId = useId();
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const reduced = usePrefersReducedMotion();

  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure, items.length]);

  if (items.length === 0) return null;
  const message = text(tour, 'message') || `Halo ${m.companyName}, saya ingin menjadwalkan tur kamar bersalin.`;
  const action = m.linkOr(text(tour, 'button_url'), m.waWith(message) ?? m.visitAction);
  const schedule = text(tour, 'schedule');

  const step = (dir: 1 | -1) => {
    const el = rail.current;
    const card = el?.querySelector('li');
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 16), behavior: reduced ? 'auto' : 'smooth' });
  };

  return (
    <TemplateSection sectionKey="tour" className={`${TONE_BG[m.tone('tour')]} ${SECTION_PAD} overflow-hidden`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-7 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP}`}>
          <SectionHead
            align="left"
            eyebrow={text(tour, 'eyebrow')}
            doodle="bed"
            title={text(tour, 'title')}
            subtitle={text(tour, 'subtitle')}
            srTitle="Tur kamar bersalin"
            className="min-w-0 @5xl:col-span-7"
          />
          {(schedule || action) && (
            <Reveal delay={120} className="flex min-w-0 flex-col gap-4 @5xl:col-span-5 @5xl:items-end">
              {schedule && (
                <p className={`flex items-start gap-2.5 text-[15px] leading-snug @5xl:max-w-[36ch] @5xl:text-right ${C.ink}`}>
                  <Doodle name="calendar" blob="fill-[#DDF3EA]" className="-mt-1 h-9 w-9 shrink-0 @5xl:order-last" />
                  {schedule}
                </p>
              )}
              <ButtonLink action={action} label={text(tour, 'button_label')} className="w-full @xl:w-auto" />
            </Reveal>
          )}
        </div>

        <Reveal variant="fade" className="mt-8 @3xl:mt-12">
          <ul
            id={railId}
            ref={rail}
            tabIndex={0}
            aria-label="Foto ruangan, geser untuk melihat lainnya"
            onScroll={measure}
            className="mk-rail -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @5xl:mx-0 @5xl:scroll-px-0 @5xl:px-0"
          >
            {items.map((item, i) => {
              const image = field(item, 'image');
              const caption = field(item, 'caption');
              return (
                <li key={`${image}-${i}`} className="w-[78%] shrink-0 snap-start @xl:w-[46%] @4xl:w-[31%] @7xl:w-[calc((100%-48px)/4)]">
                  <figure className="group">
                    <KitPhoto
                      src={image}
                      alt={MOMKID_PHOTOS.alt(image, caption || `Ruangan ${m.companyName}`)}
                      sizes="(min-width: 1280px) 24vw, (min-width: 896px) 31vw, (min-width: 576px) 46vw, 78vw"
                      className="aspect-[4/5] rounded-[28px]"
                      imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                    />
                    <figcaption className={`mt-3.5 flex items-center gap-2.5 ${DISPLAY} text-[16px] font-extrabold leading-snug ${C.ink}`}>
                      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] ${PASTELS[i % 2]}`}>
                        {i + 1}
                      </span>
                      {caption}
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
          {items.length > 1 && (
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => step(-1)} disabled={edges.start} aria-controls={railId} aria-label="Foto sebelumnya" className={ROUND}>
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button type="button" onClick={() => step(1)} disabled={edges.end} aria-controls={railId} aria-label="Foto berikutnya" className={ROUND}>
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}
        </Reveal>
      </div>
    </TemplateSection>
  );
}
