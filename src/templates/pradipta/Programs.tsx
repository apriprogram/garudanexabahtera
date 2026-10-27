// Akademik (kunci `programs`): kelompok mata pelajaran pilihan Kurikulum Merdeka sebagai daftar buka-tutup bernomor
// (satu terbuka, bawaan yang pertama; tombol aria-expanded/aria-controls, panel role="region", tertutup `inert`). Layar
// lebar: kiri foto tegak 4:5 yang menempel saat digulir dan BERGANTI (pudar) mengikuti kelompok yang dibuka — kelompok
// tanpa foto mempertahankan foto sebelumnya; kanan daftar bergaris tipis dengan nomor, judul, dan tombol "+" yang
// berputar menjadi "×". Panel berisi penjelasan + chip mata pelajaran. Di bawahnya catatan dan kartu kokurikuler. HP:
// hanya daftar; foto kelompok yang terbuka tampil di dalam panelnya.
import { Plus } from 'lucide-react';
import { useId, useState } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { splitList, type PradiptaModel } from './model';
import { PRADIPTA_PHOTOS } from './photos';
import { BAND, C, CARD, CHIP, DISPLAY, SECTION_PAD, TYPE_P } from './styles';
import { Head } from './ui';

export function Programs({ m }: { m: PradiptaModel }) {
  const { programs } = m;
  const tone = m.tone('programs');
  const items = m.items('programs');
  const baseId = useId();
  const [open, setOpen] = useState<number | null>(0);
  const firstPhoto = items.findIndex((item) => hasImage(field(item, 'image')));
  const [photo, setPhoto] = useState<number>(firstPhoto);
  const note = text(programs, 'note');
  const extraTitle = text(programs, 'extra_title');
  const extraText = text(programs, 'extra_text');
  // Foto yang tampil: kelompok terbuka bila berfoto, kalau tidak foto terakhir yang tampil
  const shownPhoto = photo >= 0 && photo < items.length && hasImage(field(items[photo], 'image')) ? photo : firstPhoto;

  const toggle = (i: number) => {
    const next = open === i ? null : i;
    setOpen(next);
    if (next !== null && hasImage(field(items[next], 'image'))) setPhoto(next);
  };

  return (
    <TemplateSection sectionKey="programs" className={`${SECTION_PAD} ${BAND[tone]}`}>
      <div className={CONTAINER}>
        <Head
          sectionKey="programs"
          eyebrow={text(programs, 'eyebrow')}
          title={text(programs, 'title')}
          fallback="Akademik"
          subtitle={text(programs, 'subtitle')}
          tone={tone}
        />
        <div className="mt-10 grid gap-10 @3xl:mt-12 @5xl:grid-cols-12 @5xl:gap-12">
          {firstPhoto >= 0 && (
            <div className="hidden @5xl:col-span-5 @5xl:block">
              <Reveal className="sticky top-[calc(var(--tpl-sticky-top,0px)+112px)]">
                <div className="relative isolate aspect-[4/3] overflow-hidden rounded-[24px] bg-(--pd-sky)">
                  {items.map((item, i) => {
                    const image = field(item, 'image');
                    if (!hasImage(image)) return null;
                    const current = i === shownPhoto;
                    return (
                      <div key={`${image}-${i}`} aria-hidden={current ? undefined : true} className={`pd-fade absolute inset-0 ${current ? 'opacity-100' : 'opacity-0'}`}>
                        <KitPhoto
                          src={image}
                          alt={current ? PRADIPTA_PHOTOS.alt(image, field(item, 'title')) : ''}
                          sizes="(min-width: 1024px) 40vw, 100vw"
                          className="absolute inset-0"
                        />
                      </div>
                    );
                  })}
                  {/* Cincin tipis di atas foto: foto berlatar terang tetap bertepi bulat di pita putih */}
                  <span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[24px] ring-1 ring-inset ring-(--pd-ring)" />
                </div>
              </Reveal>
            </div>
          )}

          <div className={`min-w-0 ${firstPhoto >= 0 ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}>
            <Reveal as="ul" className="divide-y divide-(--pd-ring) border-y border-(--pd-ring)">
              {items.map((item, i) => {
                const isOpen = open === i;
                const buttonId = `${baseId}-b${i}`;
                const panelId = `${baseId}-p${i}`;
                const image = field(item, 'image');
                const subjects = splitList(field(item, 'subjects'));
                return (
                  <li key={`${field(item, 'title')}-${i}`}>
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggle(i)}
                        className="group flex w-full items-center gap-4 py-5 text-left @3xl:gap-6 @3xl:py-6"
                      >
                        <span aria-hidden className={`${DISPLAY} w-8 shrink-0 text-[15px] font-medium tabular-nums text-(--pd-ink) @3xl:text-[17px]`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className={`min-w-0 flex-1 ${TYPE_P.h3} @3xl:text-[22px] ${C.ink}`}>{field(item, 'title')}</span>
                        <span
                          aria-hidden
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${
                            isOpen ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-(--pd-sky2) text-(--pd-ink) group-hover:bg-(--pd-ring)'
                          }`}
                        >
                          <Plus className={`pd-turn h-4 w-4 ${isOpen ? 'rotate-45' : ''}`} strokeWidth={2.2} />
                        </span>
                      </button>
                    </h3>
                    <div id={panelId} role="region" aria-labelledby={buttonId} data-open={isOpen} inert={!isOpen} className="pd-collapse">
                      <div className="overflow-hidden">
                        <div className="pb-6 pl-12 pr-2 @3xl:pl-14 @3xl:pr-12">
                          {isOpen && hasImage(image) && (
                            <KitPhoto
                              src={image}
                              alt={PRADIPTA_PHOTOS.alt(image, field(item, 'title'))}
                              sizes="100vw"
                              className="mb-5 aspect-[16/10] rounded-[16px] @5xl:hidden"
                            />
                          )}
                          {field(item, 'text') && <p className={`max-w-[60ch] ${C.body} ${TYPE_P.body}`}>{field(item, 'text')}</p>}
                          {subjects.length > 0 && (
                            <ul className="mt-4 flex flex-wrap gap-2" aria-label={`Mata pelajaran ${field(item, 'title')}`}>
                              {subjects.map((s, si) => (
                                <li key={`${s}-${si}`} className={CHIP.meta}>
                                  {s}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </Reveal>
            {note && <p className={`mt-5 text-[13px] leading-relaxed ${C.muted}`}>{note}</p>}
            {extraTitle && (
              <Reveal delay={120} className={`mt-8 p-6 @3xl:p-7 ${tone === 'sky' ? CARD.onSky : CARD.sky}`}>
                <h3 className={`${C.ink} ${TYPE_P.h3}`}>{extraTitle}</h3>
                {extraText && <p className={`mt-2 max-w-[62ch] ${C.body} ${TYPE_P.small}`}>{extraText}</p>}
              </Reveal>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
