// Profil, visi & misi (kunci `about`): panel krem membulat yang menjorok dari tepi. Label + H2, lalu tab pil (Profil,
// Visi, Misi, Nilai; tab kosong disembunyikan) dengan foto tegak di kiri. Tab mengikuti pola WAI-ARIA (tablist, panah
// kiri/kanan, Home/End, roving tabindex); panel lain tetap ada di DOM (atribut hidden) sehingga terbaca mesin pencari.
import { Quote } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, hasImage, list, paragraphs, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { SECTION_FILLED, type MadaniModel } from './model';
import { MADANI_PHOTOS } from './photos';
import { C, DISPLAY, INSET, PANEL_RADIUS, TYPE_M } from './styles';
import { SectionHead } from './ui';

type TabKey = 'profile' | 'vision' | 'mission' | 'values';

export function About({ m }: { m: MadaniModel }) {
  const { about } = m;
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const body = paragraphs(text(about, 'body'));
  const facts = list(about, 'facts', 6).filter((f) => field(f, 'label') && field(f, 'value'));
  const vision = text(about, 'vision');
  const missions = list(about, 'missions', 8).map((item) => field(item, 'text')).filter(Boolean);
  const values = list(about, 'values', 4).filter((v) => field(v, 'title'));
  const image = text(about, 'image');
  const tabs = (
    [
      { key: 'profile', label: 'Profil', show: body.length > 0 || facts.length > 0 },
      { key: 'vision', label: 'Visi', show: !!vision },
      { key: 'mission', label: 'Misi', show: missions.length > 0 },
      { key: 'values', label: 'Nilai', show: values.length > 0 },
    ] as { key: TabKey; label: string; show: boolean }[]
  ).filter((tab) => tab.show);
  const [chosen, setChosen] = useState<TabKey>('profile');
  const current = tabs.find((tab) => tab.key === chosen)?.key ?? tabs[0]?.key;
  const eyebrow = text(about, 'eyebrow');
  const title = text(about, 'title');
  // Sama dengan: judul kosong dan tidak ada tab berisi (syarat dibagi dengan menu, lihat SECTION_FILLED)
  if (!SECTION_FILLED.about(about)) return null;

  const select = (i: number) => {
    const tab = tabs[(i + tabs.length) % tabs.length];
    setChosen(tab.key);
    tabRefs.current[(i + tabs.length) % tabs.length]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((tab) => tab.key === current);
    if (e.key === 'ArrowRight') select(i + 1);
    else if (e.key === 'ArrowLeft') select(i - 1);
    else if (e.key === 'Home') select(0);
    else if (e.key === 'End') select(tabs.length - 1);
    else return;
    e.preventDefault();
  };
  const photo = hasImage(image);

  return (
    <TemplateSection sectionKey="about" className="py-2">
      <div className={`${INSET} ${PANEL_RADIUS} bg-[#F6F4EC]`}>
        <div className={`${CONTAINER} py-14 @3xl:py-20 @5xl:py-24`}>
          <SectionHead eyebrow={eyebrow} title={title} />
          <div className={`mt-10 grid gap-8 @3xl:mt-12 @5xl:grid-cols-12 @5xl:gap-12`}>
            {photo && (
              <Reveal variant="fade" className="min-w-0 @5xl:col-span-5">
                <KitPhoto
                  src={image}
                  alt={MADANI_PHOTOS.alt(image, `Suasana ${m.companyName}`)}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  zoom
                  className="aspect-[4/3] rounded-[24px] @3xl:aspect-[16/10] @5xl:aspect-[4/5]"
                />
              </Reveal>
            )}
            {tabs.length > 0 && (
              <div className={`min-w-0 ${photo ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}>
                <div role="tablist" aria-label="Profil sekolah" onKeyDown={onKeyDown} className="flex flex-wrap gap-2">
                  {tabs.map((tab, i) => {
                    const selected = tab.key === current;
                    return (
                      <button
                        key={tab.key}
                        ref={(el) => {
                          tabRefs.current[i] = el;
                        }}
                        id={`${baseId}-tab-${tab.key}`}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        aria-controls={`${baseId}-panel-${tab.key}`}
                        tabIndex={selected ? 0 : -1}
                        onClick={() => setChosen(tab.key)}
                        className={`inline-flex h-10 items-center rounded-full px-5 text-[14px] font-semibold transition-colors ${
                          selected ? 'bg-(--md-hl) text-(--md-on-hl)' : 'bg-white text-(--md-deep) ring-1 ring-inset ring-black/[0.1] hover:bg-white/70'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {tabs.map((tab) => (
                  <div
                    key={tab.key}
                    id={`${baseId}-panel-${tab.key}`}
                    role="tabpanel"
                    aria-labelledby={`${baseId}-tab-${tab.key}`}
                    hidden={tab.key !== current}
                    tabIndex={0}
                    className="mt-8 rounded-[20px] focus-visible:outline-offset-4"
                  >
                    {tab.key === 'profile' && (
                      <>
                        <h3 className="sr-only">Profil {m.companyName}</h3>
                        <div className={`space-y-4 ${TYPE_M.lead} ${C.body}`}>
                          {body.map((p, i) => (
                            <p key={i}>{p}</p>
                          ))}
                        </div>
                        {facts.length > 0 && (
                          <dl className="mt-8 grid grid-cols-2 gap-3 @3xl:grid-cols-4">
                            {facts.map((f, i) => (
                              <div key={`${field(f, 'label')}-${i}`} className="rounded-[20px] bg-white p-4 ring-1 ring-inset ring-black/[0.06]">
                                <dt className={`text-[12px] font-semibold uppercase tracking-[0.1em] ${C.muted}`}>{field(f, 'label')}</dt>
                                <dd className="mt-1.5 text-[16px] font-semibold leading-snug text-(--md-deep)">{field(f, 'value')}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                      </>
                    )}
                    {tab.key === 'vision' && (
                      <>
                        <h3 className="sr-only">Visi</h3>
                        <div className="flex gap-4 @3xl:gap-5">
                          <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--md-deep) text-(--md-hl-ink)">
                            <Quote className="h-5 w-5 fill-current" />
                          </span>
                          <p className={`${DISPLAY} text-[22px] leading-[1.3] tracking-[-0.015em] text-(--md-deep) @3xl:text-[28px]`}>{vision}</p>
                        </div>
                      </>
                    )}
                    {tab.key === 'mission' && (
                      <>
                        <h3 className="sr-only">Misi</h3>
                        <ol className="divide-y divide-black/[0.08] border-y border-black/[0.08]">
                          {missions.map((mission, i) => (
                            <li key={i} className="flex gap-4 py-4">
                              <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-semibold tabular-nums text-(--md-ink) ring-1 ring-inset ring-black/[0.08]">
                                {i + 1}
                              </span>
                              <span className={`pt-1 ${TYPE_M.body} ${C.body}`}>{mission}</span>
                            </li>
                          ))}
                        </ol>
                      </>
                    )}
                    {tab.key === 'values' && (
                      <>
                        <h3 className="sr-only">Nilai sekolah</h3>
                        <ul className="grid gap-3 @2xl:grid-cols-2">
                          {values.map((v, i) => (
                            <Reveal as="li" key={`${field(v, 'title')}-${i}`} delay={stagger(i, 60)} className="rounded-[20px] bg-white p-5 ring-1 ring-inset ring-black/[0.06]">
                              <p className={`${DISPLAY} text-[20px] text-(--md-deep)`}>
                                <span aria-hidden className="mr-2 text-(--md-ink) tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                                {field(v, 'title')}
                              </p>
                              {field(v, 'text') && <p className={`mt-2 text-[14.5px] leading-relaxed ${C.muted}`}>{field(v, 'text')}</p>}
                            </Reveal>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
