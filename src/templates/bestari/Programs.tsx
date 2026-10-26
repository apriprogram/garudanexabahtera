// Program unggulan (kunci `programs`), prestasi (`achievements`), dan guru (`teachers`).
// Program: panel pasir membulat; kiri label + judul + deskripsi + tombol sebelumnya/berikutnya, kanan CAROUSEL kartu
// FOTO tegak (lebar tetap ±300 px, menjorok sampai tepi panel; HP: geser jari, kartu berikutnya mengintip). Kartu: ikon
// bulat warna tema di kiri atas, tombol panah bulat "tanya program ini" (WhatsApp berisi nama program) di kanan atas, dan
// label pil + nama + deskripsi di atas gradasi gelap. Foto membesar pelan saat disorot.
// Prestasi: daftar bergaris tipis seperti tabel (tahun · peringkat · lomba & nama · tingkat) yang berubah warna pelan saat
// disorot (referensi Bienes, minimalis).
// Guru: panel pasir; kiri label + judul + deskripsi + tombol, kanan kartu foto guru (nama + jabatan). Di HP kartu dalam
// rel geser mendatar (referensi Bienes "Our specialist team").
import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger, useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, initials, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import type { BestariModel } from './model';
import { BESTARI_PHOTOS } from './photos';
import { C, DISPLAY, EYEBROW, PANEL, PANEL_OUTER, SECTION_PAD, TYPE_B } from './styles';
import { PillLink, SectionHead, SectionLabel, TitleIcon, Highlighted } from './ui';

/** Posisi gulir rel: bisa digulir? sudah di awal / di ujung? (tombol dinonaktifkan di ujung, disembunyikan bila semua muat) */
function useRailState(rail: RefObject<HTMLElement | null>) {
  const [state, setState] = useState({ scrollable: false, atStart: true, atEnd: false });
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const measure = () => {
      const max = el.scrollWidth - el.clientWidth;
      const next = { scrollable: max > 4, atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft >= max - 4 };
      setState((prev) => (prev.scrollable === next.scrollable && prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
    };
    const frame = window.requestAnimationFrame(measure);
    el.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => {
      window.cancelAnimationFrame(frame);
      el.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [rail]);
  return state;
}

export function Programs({ m }: { m: BestariModel }) {
  const { programs } = m;
  const items = m.items('programs');
  const railId = useId();
  const rail = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();
  const { scrollable, atStart, atEnd } = useRailState(rail);
  if (items.length === 0) return null;
  const title = text(programs, 'title');

  // Geser satu kartu (lebar kartu + jarak); halus hanya bila gerak menyala
  const move = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('li');
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: motion ? 'smooth' : 'auto' });
  };
  const round =
    'flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1C1917] transition-[background-color,color,opacity] duration-300 hover:bg-[#1C1917] hover:text-white disabled:cursor-default disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-[#1C1917]';

  return (
    <TemplateSection sectionKey="programs" className="py-2">
      <div className={PANEL_OUTER}>
        <div className={`${PANEL} ${SECTION_PAD} overflow-hidden`}>
          {/* HP–tablet: judul, rel, tombol bertumpuk. Layar lebar: kiri judul + tombol, kanan rel yang menjorok ke tepi panel */}
          <div className={`${CONTAINER} grid gap-8 @3xl:gap-10 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] @5xl:gap-x-10 @5xl:gap-y-8`}>
            <div className="min-w-0 @5xl:col-span-4 @5xl:row-start-1">
              <SectionHead
                layout="stack"
                eyebrow={text(programs, 'eyebrow')}
                number={m.number('programs')}
                title={title}
                highlight={text(programs, 'highlight')}
                subtitle={text(programs, 'subtitle')}
              />
            </div>

            <Reveal
              variant="fade"
              delay={120}
              className="-mx-5 min-w-0 @2xl:-mx-8 @5xl:col-span-8 @5xl:col-start-5 @5xl:row-span-2 @5xl:row-start-1 @5xl:ml-0 @5xl:-mr-12 @5xl:self-center @min-[96rem]:-mr-16"
            >
              {/* Rel geser: bisa difokus & digulir dengan panah keyboard, berlabel untuk pembaca layar */}
              <div
                ref={rail}
                id={railId}
                role="region"
                aria-roledescription="carousel"
                aria-label={title ? `Daftar program: ${title}` : 'Daftar program'}
                tabIndex={0}
                className="bs-rail snap-x snap-mandatory scroll-px-5 overflow-x-auto overscroll-x-contain px-5 pb-1 @2xl:scroll-px-8 @2xl:px-8 @5xl:scroll-px-0 @5xl:pl-0 @5xl:pr-12 @min-[96rem]:pr-16"
              >
                <ul className="flex gap-4">
                  {items.map((item, i) => {
                    const name = field(item, 'name');
                    const image = field(item, 'image');
                    const label = field(item, 'label');
                    const ask = m.waWith(`Halo ${m.companyName}, saya ingin bertanya tentang program ${name}.`) ?? m.ppdbAction;
                    return (
                      <li
                        key={`${name}-${i}`}
                        aria-roledescription="slide"
                        aria-label={`${i + 1} dari ${items.length}: ${name}`}
                        data-tpl-tone="inverse"
                        // Lebar tetap (bukan ikut layar) agar kartu tidak kebesaran di desktop. Tanpa overflow-hidden dan
                        // tanpa min-h tetap: rasio 4:5 jadi tinggi minimum dan kartu memanjang bila teksnya panjang (foto &
                        // gradasi dipotong sudutnya sendiri)
                        className="group/card relative isolate flex aspect-[4/5] w-[78%] max-w-[320px] shrink-0 snap-start flex-col justify-between gap-6 rounded-[24px] bg-(--bs-deep) p-4 text-white @xl:w-[300px] @3xl:p-5 @7xl:w-[320px] @7xl:max-w-none @min-[96rem]:w-[340px]"
                      >
                        {hasImage(image) && (
                          <KitPhoto
                            src={image}
                            alt={BESTARI_PHOTOS.alt(image, name)}
                            sizes="(min-width: 576px) 340px, 78vw"
                            fallback="none"
                            className="absolute inset-0 -z-20 rounded-[24px]"
                            imgClassName="transition-[scale] duration-700 ease-out group-hover/card:scale-[1.04]"
                          />
                        )}
                        <div
                          aria-hidden
                          className="absolute inset-0 -z-10 rounded-[24px] bg-[linear-gradient(180deg,rgb(24_16_12/0.3)_0%,transparent_22%,transparent_34%,rgb(24_16_12/0.62)_55%,rgb(24_16_12/0.92)_100%)]"
                        />
                        <div className="flex items-start justify-between gap-3">
                          <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                            <TitleIcon title={name} index={i} className="h-[22px] w-[22px]" />
                          </span>
                          {ask && (
                            <ActionLink
                              action={ask}
                              aria-label={`Tanya tentang program ${name}`}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1C1917] transition-colors duration-300 hover:bg-[#F5F2ED]"
                            >
                              <ArrowUpRight aria-hidden className="h-[18px] w-[18px] transition-transform duration-500 group-hover/card:rotate-45" />
                            </ActionLink>
                          )}
                        </div>
                        <div>
                          {label && (
                            <span className={`inline-flex h-7 items-center rounded-full bg-[rgb(24_16_12/0.6)] px-3 ${EYEBROW} text-[11px] text-white ring-1 ring-inset ring-white/25 backdrop-blur-md`}>
                              {label}
                            </span>
                          )}
                          <h3 className={`mt-3 text-balance ${DISPLAY} text-[21px] font-medium leading-snug tracking-[-0.02em] @3xl:text-[22px]`}>{name}</h3>
                          {field(item, 'description') && <p className="mt-2 text-[14px] leading-relaxed text-white/[0.88]">{field(item, 'description')}</p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </Reveal>

            {/* Tombol geser: hanya bila ada kartu yang tidak muat; nonaktif di ujung rel */}
            {scrollable && (
              <div role="group" aria-label="Geser daftar program" className="flex items-center gap-2 @5xl:col-span-4 @5xl:row-start-2 @5xl:self-end">
                <button type="button" onClick={() => move(-1)} disabled={atStart} aria-controls={railId} aria-label="Program sebelumnya" className={round}>
                  <ArrowLeft aria-hidden className="h-[18px] w-[18px]" />
                </button>
                <button type="button" onClick={() => move(1)} disabled={atEnd} aria-controls={railId} aria-label="Program berikutnya" className={round}>
                  <ArrowRight aria-hidden className="h-[18px] w-[18px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Achievements({ m }: { m: BestariModel }) {
  const { achievements } = m;
  const items = m.items('achievements');
  if (items.length === 0) return null;

  return (
    <TemplateSection sectionKey="achievements" className={SECTION_PAD}>
      <div className={CONTAINER}>
        <SectionHead
          eyebrow={text(achievements, 'eyebrow')}
          number={m.number('achievements')}
          title={text(achievements, 'title')}
          subtitle={text(achievements, 'subtitle')}
        />
        <ul className="mt-10 border-b border-[#1C1917]/[0.12] @3xl:mt-14">
          {items.map((item, i) => (
            <Reveal as="li" key={`${field(item, 'event')}-${i}`} delay={stagger(i, 50)} className="border-t border-[#1C1917]/[0.12]">
              {/* Warna hover di elemen dalam: kelas transition-* di <Reveal> menimpa transisi muncul-nya (shared/template.css) */}
              <div className="grid gap-x-6 gap-y-1.5 px-1 py-5 transition-colors duration-300 hover:bg-[#F5F2ED] @3xl:grid-cols-12 @3xl:items-center @3xl:px-3 @3xl:py-6">
              {field(item, 'year') && (
                <p className={`text-[13px] font-medium tabular-nums ${C.muted} @3xl:col-span-1 @3xl:text-[15px]`}>{field(item, 'year')}</p>
              )}
              {/* Judul = peringkat; tanpa peringkat → nama lomba jadi judul (tidak ada <h3> kosong) */}
              <h3 className={`${DISPLAY} text-[20px] font-medium leading-snug tracking-[-0.02em] ${C.ink} @3xl:col-span-3 @3xl:text-[24px] ${field(item, 'year') ? '' : '@3xl:col-start-2'}`}>
                {field(item, 'title') || field(item, 'event')}
              </h3>
              <div className="min-w-0 @3xl:col-span-6">
                {field(item, 'title') && field(item, 'event') && <p className={`text-[15.5px] font-medium leading-snug ${C.ink}`}>{field(item, 'event')}</p>}
                {field(item, 'name') && <p className={`mt-0.5 ${TYPE_B.small} ${C.muted}`}>{field(item, 'name')}</p>}
              </div>
              {field(item, 'level') && (
                <p className="mt-2 @3xl:col-span-2 @3xl:mt-0 @3xl:text-right">
                  <span className="inline-flex rounded-full bg-(--bs-tint) px-3 py-1 text-[12.5px] font-semibold text-(--bs-ink)">{field(item, 'level')}</span>
                </p>
              )}
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </TemplateSection>
  );
}

export function Teachers({ m }: { m: BestariModel }) {
  const { teachers } = m;
  const items = m.items('teachers');
  if (items.length === 0) return null;
  const title = text(teachers, 'title');
  const subtitle = text(teachers, 'subtitle');
  const action = m.linkOr(text(teachers, 'button_url'), m.waWith(`Halo ${m.companyName}, saya ingin bertanya kepada wali kelas.`) ?? m.startAction);

  return (
    <TemplateSection sectionKey="teachers" className="py-2">
      <div className={PANEL_OUTER}>
        <div className={`${PANEL} ${SECTION_PAD}`}>
          <div className={`${CONTAINER} grid gap-10 @5xl:grid-cols-12 @5xl:gap-12`}>
            <div className="min-w-0 @5xl:col-span-4">
              <Reveal variant="fade">
                <SectionLabel label={text(teachers, 'eyebrow')} number={m.number('teachers')} />
              </Reveal>
              {title && (
                <Reveal as="h2" delay={80} className={`mt-8 max-w-[16ch] text-balance @3xl:mt-10 ${TYPE_B.h2} ${C.ink}`}>
                  <Highlighted title={title} highlight={text(teachers, 'highlight')} />
                </Reveal>
              )}
              {subtitle && (
                <Reveal as="p" delay={140} className={`mt-4 max-w-[44ch] ${TYPE_B.body} ${C.muted}`}>
                  {subtitle}
                </Reveal>
              )}
              {action && text(teachers, 'button_label') && (
                <Reveal delay={200} className="mt-8">
                  <PillLink action={action} label={text(teachers, 'button_label')} variant="ink" />
                </Reveal>
              )}
            </div>
            <Reveal variant="fade" delay={120} className="min-w-0 @5xl:col-span-8">
              {/* HP: rel geser yang bisa difokus & digulir dengan keyboard (panah kiri/kanan), berlabel untuk pembaca layar */}
              <div
                role="region"
                aria-label={title ? `Daftar guru: ${title}` : 'Daftar guru'}
                tabIndex={0}
                className="bs-rail -mx-5 snap-x snap-mandatory scroll-px-5 overflow-x-auto rounded-[22px] px-5 pb-2 @2xl:-mx-8 @2xl:scroll-px-8 @2xl:px-8 @3xl:mx-0 @3xl:overflow-visible @3xl:px-0 @3xl:pb-0"
              >
              <ul className="flex gap-3 @3xl:grid @3xl:grid-cols-3">
                {items.map((item, i) => {
                  const name = field(item, 'name');
                  const photo = field(item, 'photo');
                  return (
                    <li key={`${name}-${i}`} className="w-[70%] max-w-[300px] shrink-0 snap-start @xl:w-[44%] @3xl:w-auto @3xl:max-w-none">
                      <figure className="group/guru">
                        {hasImage(photo) ? (
                          <KitPhoto
                            src={photo}
                            alt={BESTARI_PHOTOS.alt(photo, `Potret ${name}`)}
                            sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 70vw"
                            className="aspect-[4/5] rounded-[22px]"
                            imgClassName="transition-[scale] duration-700 ease-out group-hover/guru:scale-[1.03]"
                          />
                        ) : (
                          <div
                            aria-hidden
                            className={`flex aspect-[4/5] items-center justify-center rounded-[22px] bg-white ${DISPLAY} text-[44px] font-medium text-(--bs-ink)`}
                          >
                            {initials(name, '?')}
                          </div>
                        )}
                        <figcaption className="mt-3 px-1">
                          <span className={`block ${DISPLAY} text-[17px] font-medium leading-snug ${C.ink}`}>{name}</span>
                          {field(item, 'role') && <span className={`mt-0.5 block text-[13.5px] leading-snug ${C.muted}`}>{field(item, 'role')}</span>}
                        </figcaption>
                      </figure>
                    </li>
                  );
                })}
              </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
