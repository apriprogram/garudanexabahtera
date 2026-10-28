// Jadwal imunisasi (kunci `immunization`): PITA MINT selebar layar dengan tepi atas & bawah bergelombang. Kiri: kepala
// section; kanan: pilihan "Umur si kecil" (select), catatan "Ringkasan, ikuti anjuran dokter anak" (selalu tampil:
// isian CMS atau kalimat bawaan), dan tombol "Jadwalkan imunisasi" → WhatsApp berisi umur yang dipilih. Di bawahnya
// GARIS WAKTU: layar ≥ @6xl mendatar (titik umur berjarak sama, chip vaksin putih di bawahnya), lebih sempit tegak
// (titik di kiri, chip di kanan). Titik yang sudah lewat bertanda centang, titik berikutnya berwarna tema dengan label
// "Berikutnya", sisanya putih. Ruas garis sampai titik berikutnya terisi warna tema.
// Gerak khas (./momkid.css, sekali saat masuk layar): ruas yang terisi tumbuh berurutan; berganti umur → warna
// berpindah halus. Data jadwal hanya ringkasan umum yang diedit pemilik situs, bukan anjuran medis.
import { Check, ChevronDown } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { Doodle } from './art';
import { usePlayOnce } from './hooks';
import {
  IMMUNIZATION_NOTE,
  ageOptionLabel,
  ageOptions,
  immunizationMessage,
  immunizationStops,
  nextStop,
  startAge,
  stopState,
  type MomkidModel,
} from './model';
import { C, DISPLAY, GRID_GAP, TYPE } from './styles';
import { ButtonLink, SectionHead, Wave } from './ui';

export function Immunization({ m }: { m: MomkidModel }) {
  const { immunization } = m;
  const stops = immunizationStops(immunization);
  const [age, setAge] = useState(() => startAge(immunization, stops));
  const selectId = useId();
  const timeline = useRef<HTMLOListElement>(null);
  usePlayOnce(timeline);
  if (stops.length === 0) return null;
  const options = ageOptions(stops);
  const chosen = Math.min(age, options[options.length - 1]);
  const next = nextStop(stops, chosen);
  const note = text(immunization, 'note') || IMMUNIZATION_NOTE;
  const action = m.waWith(immunizationMessage(m.companyName, chosen)) ?? m.visitAction;
  const status = next < 0 ? 'Semua jadwal di ringkasan ini sudah lewat.' : `Jadwal berikutnya: ${stops[next].label}.`;

  return (
    <TemplateSection sectionKey="immunization" className="relative bg-[#DDF3EA] py-14 @3xl:py-20 @5xl:py-24">
      {!m.afterHero('immunization') && <Wave tone="mint" position="top" />}
      <Wave tone="mint" position="bottom" />
      <div className={CONTAINER}>
        <div className={`grid gap-y-8 @5xl:grid-cols-12 @5xl:items-end ${GRID_GAP}`}>
          <SectionHead
            align="left"
            onMint
            eyebrow={text(immunization, 'eyebrow')}
            doodle="shield"
            title={text(immunization, 'title')}
            subtitle={text(immunization, 'subtitle')}
            srTitle="Jadwal imunisasi"
            className="min-w-0 @5xl:col-span-7"
          />
          <Reveal delay={120} className="min-w-0 rounded-[28px] bg-white p-5 @3xl:p-6 @5xl:col-span-5">
            <label htmlFor={selectId} className={`block ${TYPE.label} text-[15px] ${C.ink}`}>
              {text(immunization, 'select_label') || 'Umur si kecil'}
            </label>
            <div className="relative mt-3">
              <select
                id={selectId}
                value={chosen}
                onChange={(e) => setAge(Number(e.target.value))}
                className={`block h-12 w-full appearance-none rounded-full bg-[#DDF3EA] pl-5 pr-11 ${DISPLAY} text-[16px] font-extrabold ${C.ink} focus:outline-none focus-visible:ring-2 focus-visible:ring-(--mk-accent-text)`}
              >
                {options.map((value) => (
                  <option key={value} value={value}>
                    {ageOptionLabel(value)}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className={`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 ${C.ink}`} />
            </div>
            <p className="sr-only" aria-live="polite">
              {status}
            </p>
            <p className={`mt-3 flex items-start gap-2 text-[13.5px] leading-snug ${C.muted}`}>
              <Doodle name="heart" blob="" className="-mt-1 h-6 w-6 shrink-0 text-(--mk-accent-text)" />
              {note}
            </p>
            <ButtonLink action={action} label={text(immunization, 'button_label')} size="md" className="mt-4 w-full" />
          </Reveal>
        </div>

        <ol
          ref={timeline}
          aria-label="Garis waktu jadwal imunisasi"
          className="mk-timeline mt-10 grid @3xl:mt-14 @6xl:grid-flow-col @6xl:auto-cols-fr"
        >
          {stops.map((stop, i) => {
            const state = stopState(i, next);
            const last = i === stops.length - 1;
            // Ruas menuju titik berikutnya terisi bila titik berikutnya sudah tercapai (≤ jadwal berikutnya)
            const filled = next < 0 || i < next;
            return (
              <li
                key={`${stop.months}-${i}`}
                data-state={state}
                className={`relative grid grid-cols-[56px_minmax(0,1fr)] gap-x-4 ${last ? '' : 'pb-5'} @6xl:flex @6xl:flex-col @6xl:items-center @6xl:gap-x-0 @6xl:px-1.5 @6xl:pb-0 @6xl:text-center`}
              >
                {!last && (
                  <span aria-hidden className="absolute bottom-0 left-[25px] top-14 w-1.5 rounded-full bg-white @6xl:bottom-auto @6xl:left-1/2 @6xl:top-[25px] @6xl:h-1.5 @6xl:w-full">
                    <span
                      className={`mk-seg block h-full w-full rounded-full ${filled ? 'bg-(--tpl-accent)' : 'bg-transparent'}`}
                      style={{ '--mk-d': `${0.2 + i * 0.14}s` } as CSSProperties}
                    />
                  </span>
                )}
                <span
                  aria-hidden
                  className={`relative z-[1] flex h-14 w-14 flex-col items-center justify-center rounded-full leading-none transition-colors duration-300 ${
                    state === 'next' ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : `bg-white ${C.ink}`
                  }`}
                >
                  <span className={`${DISPLAY} text-[19px] font-extrabold tabular-nums`}>{stop.months}</span>
                  <span className="mt-0.5 text-[10.5px] font-semibold">bln</span>
                  {state === 'done' && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1E6B53] text-white">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <div className="min-w-0 pt-1 @6xl:mt-3 @6xl:w-full @6xl:pt-0">
                  <p className={`flex flex-wrap items-center gap-2 ${DISPLAY} text-[16px] font-extrabold leading-tight ${C.ink} @6xl:justify-center @6xl:text-[15px]`}>
                    {stop.label}
                    {/* HP: label "Berikutnya" di samping umur; layar lebar: di atas titik (baris label sejajar) */}
                    {state === 'next' && (
                      <span
                        className={`inline-flex h-6 items-center rounded-full bg-white px-2.5 text-[12px] ${C.accent} @6xl:absolute @6xl:-top-9 @6xl:left-1/2 @6xl:-translate-x-1/2 @6xl:whitespace-nowrap`}
                      >
                        Berikutnya
                      </span>
                    )}
                    {state === 'done' && <span className="sr-only">(sudah lewat)</span>}
                  </p>
                  <ul aria-label={`Vaksin ${stop.label}`} className="mt-2.5 flex flex-wrap gap-1.5 @6xl:flex-col @6xl:items-stretch">
                    {stop.vaccines.map((vaccine, j) => (
                      <li
                        key={`${vaccine}-${j}`}
                        className={`rounded-xl px-2.5 py-1.5 text-[13px] font-medium leading-tight transition-colors duration-300 @6xl:text-[12.5px] ${
                          state === 'next' ? 'bg-white text-[#2E2228] ring-2 ring-inset ring-(--tpl-accent)' : state === 'done' ? 'bg-white/60 text-[#2E2228]' : 'bg-white text-[#2E2228]'
                        }`}
                      >
                        {vaccine}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </TemplateSection>
  );
}
