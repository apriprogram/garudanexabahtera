// Akademik (kunci `programs`), pita putih: paket mata pelajaran pilihan kelas XI–XII. Kepala section, lalu tablist
// bergaris bawah (nomor mono + nama paket) dengan SATU garis penunjuk warna tema yang bergeser ke tab aktif; panah
// kiri/kanan, Home/End, tabindex bergulir. Bawah: kiri 7 kolom panggung foto 4:3 berisi semua foto paket yang ditumpuk
// dan berganti pudar ≤ 300 ms; kanan 5 kolom panel tab (label, judul serif, deskripsi, mata pelajaran bernomor, rencana
// studi). Panel tidak aktif `hidden` tetapi tetap di HTML untuk perayap. Di bawahnya catatan kurikulum + kartu
// kokurikuler. HP: tab menjadi rel geser, foto, lalu panel.
import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { NawasenaMark } from './marks';
import { linesOf, type NawasenaModel } from './model';
import { NAWASENA_PHOTOS } from './photos';
import { C, CARD, DISPLAY, SECTION_PAD, TYPE_N } from './styles';
import { SectionHead } from './ui';

const pad = (n: number) => String(n).padStart(2, '0');

export function Programs({ m }: { m: NawasenaModel }) {
  const { programs } = m;
  const items = m.items('programs');
  const baseId = useId();
  const [current, setCurrent] = useState(0);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.min(current, Math.max(0, items.length - 1));
  const count = items.length;

  // Posisi garis penunjuk dari tab aktif (diukur ulang saat tab/rel berubah ukuran, mis. huruf selesai dimuat). Tanpa
  // ResizeObserver (jsdom, perayap) → tanpa garis bergeser; tab aktif memakai garis statisnya sendiri.
  useEffect(() => {
    const tab = tabRefs.current[selected];
    if (!tab || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => setBar(tab.offsetWidth > 0 ? { x: tab.offsetLeft, w: tab.offsetWidth } : null));
    observer.observe(tab);
    if (tab.parentElement) observer.observe(tab.parentElement);
    return () => observer.disconnect();
  }, [selected, count]);

  if (count === 0) return null;
  const anyPhoto = items.some((item) => hasImage(field(item, 'image')));
  // Paket terpilih tanpa foto (paket lain berfoto) → panggung tetap ada agar tata letak tidak meloncat antar-tab, berisi
  // simbol sekolah samar alih-alih kotak kosong
  const selectedPhoto = hasImage(field(items[selected], 'image'));
  const fitLabel = text(programs, 'fit_label') || 'Rencana studi';
  const note = text(programs, 'note');
  const extraTitle = text(programs, 'extra_title');
  const extraText = text(programs, 'extra_text');

  const select = (i: number, focus = false) => {
    setCurrent(i);
    if (focus) tabRefs.current[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, number> = { ArrowRight: selected + 1, ArrowLeft: selected - 1, Home: 0, End: count - 1 };
    if (!(e.key in next)) return;
    e.preventDefault();
    select((next[e.key] + count) % count, true);
  };

  return (
    <TemplateSection sectionKey="programs" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(programs, 'eyebrow')} number={m.number('programs')} title={text(programs, 'title') || 'Akademik'} subtitle={text(programs, 'subtitle')} />

        <Reveal className="mt-10 @3xl:mt-14">
          <div
            role="tablist"
            aria-label={text(programs, 'eyebrow') || 'Paket mata pelajaran'}
            onKeyDown={onKeyDown}
            className="nw-rail relative -mx-5 flex gap-6 overflow-x-auto border-b border-black/[0.08] px-5 @2xl:-mx-8 @2xl:px-8 @3xl:gap-10 @5xl:mx-0 @5xl:px-0"
          >
            {items.map((item, i) => {
              const isSelected = i === selected;
              return (
                <button
                  key={`${field(item, 'name')}-${i}`}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${baseId}-tab-${i}`}
                  aria-selected={isSelected}
                  aria-controls={`${baseId}-panel-${i}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => select(i)}
                  className={`relative flex h-14 shrink-0 items-center gap-2.5 text-[15.5px] font-semibold transition-colors duration-300 @3xl:text-[16px] ${
                    isSelected ? C.navy : `${C.muted} hover:text-(--nw-navy)`
                  } ${isSelected && !bar ? "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-(--tpl-accent) after:content-['']" : ''}`}
                >
                  <span aria-hidden className={`${TYPE_N.mono} text-(--nw-ink)`}>
                    {pad(i + 1)}
                  </span>
                  {field(item, 'name')}
                </button>
              );
            })}
            {bar && (
              <span
                aria-hidden
                className="nw-tab-indicator pointer-events-none absolute bottom-0 left-0 h-0.5 bg-(--tpl-accent)"
                style={{ '--nw-tab-x': `${bar.x}px`, '--nw-tab-w': `${bar.w}px` } as CSSProperties}
              />
            )}
          </div>
        </Reveal>

        <div className={`mt-8 grid gap-8 @5xl:mt-10 ${anyPhoto ? '@5xl:grid-cols-12 @5xl:items-start @5xl:gap-8 @7xl:gap-12' : ''}`}>
          {anyPhoto && (
            <Reveal className="min-w-0 @5xl:col-span-7">
              <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[8px] bg-(--nw-tint)">
                <div aria-hidden className={`nw-fade absolute inset-0 flex items-center justify-center ${selectedPhoto ? 'opacity-0' : 'opacity-100'}`}>
                  <NawasenaMark className="h-20 w-20 text-(--nw-ink) opacity-30" />
                </div>
                {items.map((item, i) => {
                  const image = field(item, 'image');
                  if (!hasImage(image)) return null;
                  const on = i === selected;
                  return (
                    <div key={`${image}-${i}`} aria-hidden={on ? undefined : true} className={`nw-fade absolute inset-0 ${on ? 'opacity-100' : 'opacity-0'}`}>
                      <KitPhoto
                        src={image}
                        alt={on ? NAWASENA_PHOTOS.alt(image, `Kegiatan paket ${field(item, 'name')} di ${m.companyName}`) : ''}
                        sizes="(min-width: 1024px) 56vw, 92vw"
                        className="absolute inset-0"
                      />
                    </div>
                  );
                })}
              </div>
            </Reveal>
          )}
          <div className={`min-w-0 ${anyPhoto ? '@5xl:col-span-5' : ''}`}>
            {items.map((item, i) => {
              const subjects = linesOf(field(item, 'subjects'));
              const label = field(item, 'label');
              const description = field(item, 'description');
              const fit = field(item, 'fit');
              return (
                <div
                  key={`${field(item, 'name')}-${i}`}
                  role="tabpanel"
                  id={`${baseId}-panel-${i}`}
                  aria-labelledby={`${baseId}-tab-${i}`}
                  hidden={i !== selected}
                  tabIndex={0}
                  className="rounded-[8px]"
                >
                  {label && (
                    <span className="inline-flex h-6 items-center rounded-[4px] bg-(--nw-tint) px-2 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-(--nw-ink)">
                      {label}
                    </span>
                  )}
                  <h3 className={`${label ? 'mt-4' : ''} text-balance text-[26px] leading-[1.15] ${C.navy} ${DISPLAY} font-normal @3xl:text-[32px]`}>{field(item, 'name')}</h3>
                  {description && <p className={`mt-3 max-w-[52ch] ${C.body} ${TYPE_N.body}`}>{description}</p>}
                  {subjects.length > 0 && (
                    <ol className="mt-6 divide-y divide-black/[0.08] border-y border-black/[0.08]">
                      {subjects.map((subject, n) => (
                        <li key={`${subject}-${n}`} className={`flex items-baseline gap-4 py-3 text-[15.5px] font-medium ${C.navy}`}>
                          <span aria-hidden className={`${TYPE_N.mono} w-6 shrink-0 text-(--nw-ink)`}>
                            {pad(n + 1)}
                          </span>
                          {subject}
                        </li>
                      ))}
                    </ol>
                  )}
                  {fit && (
                    <p className={`mt-5 text-[15px] leading-relaxed ${C.muted}`}>
                      <span className={`mr-2 ${TYPE_N.mono} text-(--nw-ink)`}>{fitLabel}</span>
                      {fit}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {(note || extraTitle) && (
          // Sejajar dengan kisi di atasnya: kartu kokurikuler di bawah foto (7 kolom), catatan kurikulum di bawah panel (5)
          <div className="mt-8 grid gap-6 @3xl:mt-10 @5xl:grid-cols-12 @5xl:items-center @5xl:gap-8 @7xl:gap-12">
            {extraTitle && (
              <Reveal className={`p-6 @3xl:p-7 ${CARD.surface} ${note ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}>
                <h3 className={`${C.navy} ${TYPE_N.h3}`}>{extraTitle}</h3>
                {extraText && <p className={`mt-2 max-w-[70ch] ${C.body} ${TYPE_N.body}`}>{extraText}</p>}
              </Reveal>
            )}
            {note && <p className={`max-w-[48ch] text-[13.5px] leading-relaxed ${C.muted} ${extraTitle ? '@5xl:col-span-5' : '@5xl:col-span-12'}`}>{note}</p>}
          </div>
        )}
      </div>
    </TemplateSection>
  );
}
