// PPDB (kunci `ppdb`): panel krem membulat. Kepala: label, H2, deskripsi, lencana status (titik menyala) + kuota, dan
// tombol "Isi formulir". Kiri: jalur pendaftaran (tab pil + kartu putih berisi kuota, penjelasan, syarat, tombol
// "Daftar lewat jalur ini" yang memilih jalur di formulir), jadwal berupa linimasa, syarat umum, alur bernomor, dan
// rincian biaya opsional. Kanan (lengket di layar lebar): kartu formulir minat yang menyusun pesan WhatsApp
// (./PpdbForm). Jujur: tanpa penyimpanan data dan tanpa pembayaran online.
import { ArrowDown, ArrowRight, Check } from 'lucide-react';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { field, list, text } from '../shared/utils';
import { lines, type MadaniModel } from './model';
import { PpdbForm, type PpdbFormHandle } from './PpdbForm';
import { BTN, C, DISPLAY, INSET, PANEL_RADIUS, TYPE_M } from './styles';
import { Chip, Eyebrow } from './ui';

const H3 = `${DISPLAY} text-[20px] leading-snug tracking-[-0.015em] text-(--md-deep) @3xl:text-[22px]`;

export function Ppdb({ m }: { m: MadaniModel }) {
  const { ppdb } = m;
  const baseId = useId();
  const formRef = useRef<PpdbFormHandle>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [chosen, setChosen] = useState(0);
  const tracks = list(ppdb, 'tracks', 5).filter((t) => field(t, 'name'));
  const schedule = list(ppdb, 'schedule', 8).filter((s) => field(s, 'title'));
  const requirements = lines(text(ppdb, 'requirements'));
  const steps = list(ppdb, 'steps', 5).filter((s) => field(s, 'title'));
  const fees = list(ppdb, 'fees', 8).filter((f) => field(f, 'name') && field(f, 'amount'));
  const formTitle = text(ppdb, 'form_title');
  const formButton = text(ppdb, 'form_button');
  const showForm = !!(formTitle || formButton);
  const eyebrow = text(ppdb, 'eyebrow');
  const title = text(ppdb, 'title');
  const subtitle = text(ppdb, 'subtitle');
  const status = text(ppdb, 'status');
  const quota = text(ppdb, 'quota');
  const current = Math.min(chosen, Math.max(0, tracks.length - 1));
  if (!title && tracks.length === 0 && schedule.length === 0 && !showForm) return null;

  const selectTab = (i: number) => {
    const next = (i + tracks.length) % tracks.length;
    setChosen(next);
    tabRefs.current[next]?.focus();
  };
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') selectTab(current + 1);
    else if (e.key === 'ArrowLeft') selectTab(current - 1);
    else if (e.key === 'Home') selectTab(0);
    else if (e.key === 'End') selectTab(tracks.length - 1);
    else return;
    e.preventDefault();
  };
  const track = tracks[current];
  const trackReqs = track ? lines(field(track, 'requirements')) : [];

  return (
    <TemplateSection sectionKey="ppdb" className="py-2">
      <div className={`${INSET} ${PANEL_RADIUS} relative isolate overflow-hidden bg-[#F6F4EC]`}>
        <div className={`${CONTAINER} py-14 @3xl:py-20 @5xl:py-24`}>
          {/* Kepala */}
          <div className="grid gap-6 @5xl:grid-cols-12 @5xl:items-end @5xl:gap-10">
            <div className="min-w-0 @5xl:col-span-7">
              {eyebrow && (
                <Reveal>
                  <Eyebrow>{eyebrow}</Eyebrow>
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={60} className={`${eyebrow ? 'mt-4' : ''} max-w-[20ch] text-balance text-(--md-deep) ${TYPE_M.h2}`}>
                  {title}
                </Reveal>
              )}
              {subtitle && (
                <Reveal as="p" delay={120} className={`mt-4 max-w-[60ch] ${TYPE_M.lead} ${C.muted}`}>
                  {subtitle}
                </Reveal>
              )}
            </div>
            <Reveal delay={160} className="flex min-w-0 flex-wrap items-center gap-2 @5xl:col-span-5 @5xl:justify-end">
              {status && (
                <span className="inline-flex h-9 items-center gap-2 rounded-full bg-(--md-deep) px-4 text-[13.5px] font-semibold text-white">
                  <span aria-hidden className="md-pulse h-2 w-2 rounded-full bg-(--md-hl)" />
                  {status}
                </span>
              )}
              {quota && <span className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[13.5px] font-semibold text-(--md-deep) ring-1 ring-inset ring-black/[0.08]">{quota}</span>}
              {showForm && (
                <button
                  type="button"
                  onClick={() => formRef.current?.focusForm()}
                  className={`${BTN.ghost} h-9 gap-1.5 bg-white px-4 text-[13.5px] @5xl:hidden`}
                >
                  Isi formulir
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </button>
              )}
            </Reveal>
          </div>

          <div className="mt-10 grid gap-10 @3xl:mt-14 @5xl:grid-cols-12 @5xl:gap-10 @7xl:gap-14">
            <div className={`min-w-0 space-y-12 ${showForm ? '@5xl:col-span-7' : '@5xl:col-span-12'}`}>
              {/* Jalur pendaftaran */}
              {tracks.length > 0 && (
                <div>
                  <h3 className={H3}>Jalur pendaftaran</h3>
                  <div role="tablist" aria-label="Jalur pendaftaran" onKeyDown={onTabKey} className="mt-4 flex flex-wrap gap-2">
                    {tracks.map((t, i) => {
                      const selected = i === current;
                      return (
                        <button
                          key={`${field(t, 'name')}-${i}`}
                          ref={(el) => {
                            tabRefs.current[i] = el;
                          }}
                          id={`${baseId}-jalur-${i}`}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          aria-controls={`${baseId}-jalur-panel`}
                          tabIndex={selected ? 0 : -1}
                          onClick={() => setChosen(i)}
                          className={`inline-flex h-10 items-center rounded-full px-4 text-[14px] font-semibold transition-colors @3xl:px-5 ${
                            selected ? 'bg-(--md-hl) text-(--md-on-hl)' : 'bg-white text-(--md-deep) ring-1 ring-inset ring-black/[0.1] hover:bg-white/70'
                          }`}
                        >
                          {field(t, 'name')}
                        </button>
                      );
                    })}
                  </div>
                  {track && (
                    <div
                      id={`${baseId}-jalur-panel`}
                      role="tabpanel"
                      aria-labelledby={`${baseId}-jalur-${current}`}
                      tabIndex={0}
                      className="mt-4 rounded-[24px] bg-white p-5 ring-1 ring-inset ring-black/[0.06] @3xl:p-7"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className={`${DISPLAY} text-[19px] text-(--md-deep)`}>Jalur {field(track, 'name')}</p>
                        {field(track, 'quota') && <Chip tone="tint">{field(track, 'quota')}</Chip>}
                      </div>
                      {field(track, 'description') && <p className={`mt-3 ${TYPE_M.body} ${C.body}`}>{field(track, 'description')}</p>}
                      {trackReqs.length > 0 && (
                        <ul className="mt-5 grid gap-2.5 @2xl:grid-cols-2">
                          {trackReqs.map((req, i) => (
                            <li key={i} className={`flex gap-2.5 text-[14.5px] leading-snug ${C.body}`}>
                              <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--md-tint) text-(--md-ink)">
                                <Check className="h-3 w-3" strokeWidth={3} />
                              </span>
                              {req}
                            </li>
                          ))}
                        </ul>
                      )}
                      {showForm && (
                        <button
                          type="button"
                          onClick={() => formRef.current?.focusForm(field(track, 'name'))}
                          className="group mt-6 inline-flex min-h-10 items-center gap-2 text-[14.5px] font-semibold text-(--md-ink)"
                        >
                          Daftar lewat jalur {field(track, 'name')}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Jadwal (linimasa) */}
              {schedule.length > 0 && (
                <div>
                  <h3 className={H3}>Jadwal PPDB</h3>
                  <ol className="relative mt-6 space-y-6 before:absolute before:bottom-2 before:left-[9px] before:top-2 before:w-px before:bg-black/[0.12]">
                    {schedule.map((s, i) => {
                      const st = field(s, 'status');
                      return (
                        <Reveal as="li" key={`${field(s, 'title')}-${i}`} delay={stagger(i, 60)} className="relative pl-9">
                          <span
                            aria-hidden
                            className={`absolute left-0 top-1 flex h-[19px] w-[19px] items-center justify-center rounded-full ring-4 ring-[#F6F4EC] ${
                              st ? 'bg-(--md-primary)' : 'bg-white ring-offset-0'
                            }`}
                          >
                            <span className={`h-[7px] w-[7px] rounded-full ${st ? 'bg-(--md-hl)' : 'bg-black/25'}`} />
                          </span>
                          <p className="flex flex-wrap items-center gap-2">
                            <span className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${st ? 'text-(--md-ink)' : C.muted}`}>{field(s, 'date')}</span>
                            {st && <Chip tone="hl" className="h-6 px-2.5 text-[11px]">{st}</Chip>}
                          </p>
                          <p className="mt-1 text-[16.5px] font-semibold leading-snug text-(--md-deep)">{field(s, 'title')}</p>
                          {field(s, 'text') && <p className={`mt-0.5 text-[14.5px] leading-relaxed ${C.muted}`}>{field(s, 'text')}</p>}
                        </Reveal>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* Syarat umum */}
              {requirements.length > 0 && (
                <div>
                  <h3 className={H3}>Syarat umum</h3>
                  <ul className="mt-5 grid gap-x-6 gap-y-3 @2xl:grid-cols-2">
                    {requirements.map((req, i) => (
                      <li key={i} className={`flex gap-2.5 text-[14.5px] leading-snug ${C.body}`}>
                        <span aria-hidden className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--md-deep) text-(--md-hl-ink)">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alur pendaftaran */}
              {steps.length > 0 && (
                <div>
                  <h3 className={H3}>Alur pendaftaran</h3>
                  <ol className="mt-5 grid gap-3 @2xl:grid-cols-2">
                    {steps.map((s, i) => (
                      <Reveal as="li" key={`${field(s, 'title')}-${i}`} delay={stagger(i, 60)} className="rounded-[20px] bg-white p-5 ring-1 ring-inset ring-black/[0.06]">
                        <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-(--md-ink)">Langkah {i + 1}</span>
                        <p className="mt-2 text-[16px] font-semibold leading-snug text-(--md-deep)">{field(s, 'title')}</p>
                        {field(s, 'text') && <p className={`mt-1 text-[14px] leading-relaxed ${C.muted}`}>{field(s, 'text')}</p>}
                      </Reveal>
                    ))}
                  </ol>
                </div>
              )}

              {/* Biaya (opsional) */}
              {fees.length > 0 && (
                <div>
                  <h3 className={H3}>Rincian biaya</h3>
                  <dl className="mt-5 divide-y divide-black/[0.08] rounded-[20px] bg-white px-5 ring-1 ring-inset ring-black/[0.06]">
                    {fees.map((f, i) => (
                      <div key={`${field(f, 'name')}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-4">
                        <dt className="min-w-0">
                          <span className="block text-[15px] font-semibold text-(--md-deep)">{field(f, 'name')}</span>
                          {field(f, 'note') && <span className={`block text-[13px] ${C.muted}`}>{field(f, 'note')}</span>}
                        </dt>
                        <dd className={`${DISPLAY} text-[17px] tabular-nums text-(--md-deep)`}>{field(f, 'amount')}</dd>
                      </div>
                    ))}
                  </dl>
                  {text(ppdb, 'fees_note') && <p className={`mt-3 text-[13.5px] leading-relaxed ${C.muted}`}>{text(ppdb, 'fees_note')}</p>}
                </div>
              )}
            </div>

            {showForm && (
              <div className="min-w-0 @5xl:col-span-5">
                <div className="rounded-[28px] bg-white p-5 ring-1 ring-inset ring-black/[0.06] @3xl:p-7 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+92px)]">
                  <PpdbForm
                    ref={formRef}
                    title={formTitle || 'Formulir minat pendaftaran'}
                    intro={text(ppdb, 'form_text')}
                    button={formButton}
                    tracks={tracks.map((t) => field(t, 'name'))}
                    programs={lines(text(ppdb, 'program_options'), 6)}
                    whatsapp={m.ppdbWhatsapp}
                    school={m.companyName}
                    period={eyebrow}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
