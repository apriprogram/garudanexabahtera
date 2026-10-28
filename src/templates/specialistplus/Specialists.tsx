// Spesialis & jadwal dokter (kunci `specialists`). Kepala section, lalu daftar TAB berbentuk kisi sel data (kode mono,
// ikon, nama klinik, jumlah dokter; sel aktif navy dengan garis teal 3px di atas) — role=tablist, panah/Home/End
// memindahkan fokus & memilih. Panel: foto 4:3 (opsional) di kolom 1-4, lalu nama klinik (H3), ringkasan, chip kondisi
// & tindakan; di bawahnya TABEL jadwal dokter (caption, th scope=col: Dokter · Hari · Jam · Ruang) dengan tombol
// "Daftar" per dokter yang menyusun pesan WhatsApp. HP: kisi tab 2 kolom, jadwal jadi baris bertumpuk. Klinik yang
// dipilih sama dengan pilihan di konsol hero (state di root).
import { Info } from 'lucide-react';
import { useId, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, text, type LinkAction } from '../shared/utils';
import type { ListItem } from '../types';
import { KitPhoto } from '../kit/Photo';
import { doctorInitials, registerMessage, type Specialty, type SpxModel } from './model';
import { SPECIALISTPLUS_PHOTOS } from './photos';
import { BTN, C, MONO_LABEL, MONO_VALUE, SECTION_PAD, TYPE_S } from './styles';
import { Chips, MedIcon, SectionHead } from './ui';

/** Kolom kisi tab per jumlah klinik (kelas utuh agar terbaca Tailwind). */
const TAB_COLS: Record<number, string> = {
  1: '@6xl:grid-cols-1',
  2: '@6xl:grid-cols-2',
  3: '@6xl:grid-cols-3',
  4: '@6xl:grid-cols-4',
  5: '@6xl:grid-cols-5',
  6: '@6xl:grid-cols-6',
  7: '@6xl:grid-cols-4',
  8: '@6xl:grid-cols-4',
};

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#F2F6F8] font-mono text-[12.5px] font-semibold text-(--tpl-accent-ink) ring-1 ring-inset ring-[#0D1B2A]/[0.08]"
    >
      {doctorInitials(name)}
    </span>
  );
}

function RegisterLink({ action, label, doctor, className = '' }: { action: LinkAction | null; label: string; doctor: string; className?: string }) {
  if (!action || !label) return null;
  return (
    <ActionLink action={action} aria-label={`${label}: ${doctor}`} className={`${BTN.outline} ${BTN.sm} ${className}`}>
      {label}
    </ActionLink>
  );
}

function Schedule({ m, specialty }: { m: SpxModel; specialty: Specialty }) {
  const { specialists } = m;
  const label = text(specialists, 'register_label') || 'Daftar';
  const note = text(specialists, 'table_note');
  const doctors = specialty.doctors;
  const action = (doctor: ListItem): LinkAction | null => m.waWith(registerMessage(doctor, specialty.name, m.companyName)) ?? m.contactAction;
  if (doctors.length === 0) {
    return note ? <p className={`mt-8 ${TYPE_S.small} ${C.muted}`}>{note}</p> : null;
  }
  return (
    <div className="mt-8 @5xl:mt-10">
      {/* Layar ≥ @5xl: tabel (baris muncul bertahap saat panel tampil, CSS .spx-row) */}
      <Reveal variant="fade" className="hidden overflow-x-auto rounded-[8px] bg-white ring-1 ring-inset ring-[#0D1B2A]/[0.1] @5xl:block">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <caption className="sr-only">Jadwal dokter {specialty.name}</caption>
          <thead>
            <tr className={`border-b ${C.line} ${C.surface}`}>
              <th scope="col" className={`px-5 py-3 font-medium ${MONO_LABEL} ${C.muted}`}>
                Dokter
              </th>
              <th scope="col" className={`px-4 py-3 font-medium ${MONO_LABEL} ${C.muted}`}>
                Hari
              </th>
              <th scope="col" className={`px-4 py-3 font-medium ${MONO_LABEL} ${C.muted}`}>
                Jam
              </th>
              <th scope="col" className={`px-4 py-3 font-medium ${MONO_LABEL} ${C.muted}`}>
                Ruang
              </th>
              <th scope="col" className="px-5 py-3">
                <span className="sr-only">Pendaftaran</span>
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y ${C.divide}`}>
            {doctors.map((doctor, i) => {
              const name = field(doctor, 'name');
              return (
                <tr key={`${name}-${i}`} className="spx-row" style={{ '--spx-i': i } as CSSProperties}>
                  <td className="px-5 py-3.5">
                    <span className="flex items-center gap-3.5">
                      <Avatar name={name} />
                      <span className={`text-[15px] font-medium ${C.ink}`}>{name}</span>
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 ${MONO_VALUE} ${C.ink}`}>{field(doctor, 'days')}</td>
                  <td className={`px-4 py-3.5 ${MONO_VALUE} ${C.ink}`}>{field(doctor, 'hours')}</td>
                  <td className={`px-4 py-3.5 ${MONO_VALUE} ${C.muted}`}>{field(doctor, 'room')}</td>
                  <td className="px-5 py-2.5 text-right">
                    <RegisterLink action={action(doctor)} label={label} doctor={name} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Reveal>

      {/* HP: baris bertumpuk; tablet: tombol daftar di kanan baris */}
      <ul aria-label={`Jadwal dokter ${specialty.name}`} className={`divide-y border-y ${C.line} ${C.divide} @5xl:hidden`}>
        {doctors.map((doctor, i) => {
          const name = field(doctor, 'name');
          return (
            <li key={`${name}-${i}`} className="py-4 @xl:grid @xl:grid-cols-[minmax(0,1fr)_auto] @xl:items-center @xl:gap-x-8">
              <div className="min-w-0">
                <p className="flex items-center gap-3">
                  <Avatar name={name} />
                  <span className={`text-[15px] font-medium leading-snug ${C.ink}`}>{name}</span>
                </p>
                <dl className="mt-3 grid grid-cols-3 gap-3 @xl:max-w-[460px]">
                  {[
                    ['Hari', field(doctor, 'days')],
                    ['Jam', field(doctor, 'hours')],
                    ['Ruang', field(doctor, 'room')],
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0">
                      <dt className={`${MONO_LABEL} ${C.muted}`}>{label}</dt>
                      <dd className={`mt-1 text-[13.5px] font-medium leading-snug tabular-nums ${C.ink}`}>{value || '–'}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <RegisterLink action={action(doctor)} label={label} doctor={name} className="mt-3 flex w-full @xl:mt-0 @xl:w-auto" />
            </li>
          );
        })}
      </ul>

      {note && (
        <p className={`mt-4 flex items-start gap-2 ${TYPE_S.small} ${C.muted}`}>
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          {note}
        </p>
      )}
    </div>
  );
}

export function Specialists({ m, active, onSelect }: { m: SpxModel; active: number; onSelect: (index: number) => void }) {
  const { specialists } = m;
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const list = m.specialties;
  if (list.length === 0) return null;
  const index = Math.min(Math.max(0, active), list.length - 1);
  const current = list[index];
  const eyebrow = text(specialists, 'eyebrow');

  const go = (next: number) => {
    const target = (next + list.length) % list.length;
    onSelect(target);
    tabs.current[target]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => go(index + 1),
      ArrowDown: () => go(index + 1),
      ArrowLeft: () => go(index - 1),
      ArrowUp: () => go(index - 1),
      Home: () => go(0),
      End: () => go(list.length - 1),
    };
    const run = keys[e.key];
    if (!run) return;
    e.preventDefault();
    run();
  };
  const photo = hasImage(current.image);

  return (
    <TemplateSection sectionKey="specialists" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={eyebrow} code={m.code('specialists')} title={text(specialists, 'title')} subtitle={text(specialists, 'subtitle')} srTitle={eyebrow || 'Spesialis'} />

        <Reveal className="mt-10 @5xl:mt-14">
          <div role="tablist" aria-label="Klinik spesialis" onKeyDown={onKeyDown} className={`grid grid-cols-2 gap-2 @3xl:grid-cols-3 ${TAB_COLS[list.length] ?? '@6xl:grid-cols-4'}`}>
            {list.map((s) => {
              const selected = s.index === index;
              return (
                <button
                  key={s.index}
                  ref={(el) => {
                    tabs.current[s.index] = el;
                  }}
                  id={`${baseId}-tab-${s.index}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${baseId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onSelect(s.index)}
                  data-spx-tab={s.index}
                  className={`relative flex min-h-[76px] min-w-0 flex-col justify-between gap-2 overflow-hidden rounded-[8px] px-3.5 pb-3 pt-3.5 text-left ring-1 ring-inset transition-colors duration-200 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-(--tpl-accent) before:transition-opacity @3xl:min-h-[88px] @3xl:px-4 ${
                    selected
                      ? 'bg-(--spx-navy) text-white ring-(--spx-navy) before:opacity-100'
                      : `bg-white ${C.ink} ring-[#0D1B2A]/[0.12] before:opacity-0 hover:ring-(--tpl-accent)`
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`${MONO_LABEL} ${selected ? 'text-(--spx-bright)' : 'text-(--tpl-accent-ink)'}`}>{s.code || String(s.index + 1).padStart(2, '0')}</span>
                    <MedIcon name={`${s.tab} ${s.name}`} className={`h-[18px] w-[18px] ${selected ? 'text-white/80' : C.muted}`} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block truncate text-[15px] font-semibold leading-tight @3xl:text-[16px]`}>{s.tab}</span>
                    <span className={`mt-0.5 block font-mono text-[11.5px] ${selected ? 'text-white/70' : C.muted}`}>
                      {s.doctors.length > 0 ? `${s.doctors.length} dokter` : 'Jadwal menyusul'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div
          key={current.index}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${current.index}`}
          tabIndex={0}
          data-spx-panel={current.index}
          className="spx-panel mt-8 rounded-[8px] focus-visible:outline-2 focus-visible:outline-offset-4 @5xl:mt-10"
        >
          {/* Tablet: foto 5 kolom di samping teks (tidak memenuhi layar); layar lebar: 4 + 8 kolom */}
          <div className="grid gap-y-6 @3xl:grid-cols-12 @3xl:gap-x-6 @5xl:gap-x-8 @7xl:gap-x-10">
            {photo && (
              <div className="min-w-0 @3xl:col-span-5 @5xl:col-span-4">
                <KitPhoto
                  src={current.image}
                  alt={SPECIALISTPLUS_PHOTOS.alt(current.image, `Suasana klinik ${current.name}`)}
                  fallback="none"
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 40vw, 100vw"
                  className="aspect-[16/9] rounded-[8px] @3xl:aspect-[4/3] @5xl:aspect-[3/2]"
                />
              </div>
            )}
            <div className={`min-w-0 ${photo ? '@3xl:col-span-7 @5xl:col-span-8' : '@3xl:col-span-12'}`}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h3 className={`${TYPE_S.h3} ${C.ink}`}>{current.name}</h3>
                {current.code && <span className={`rounded-[4px] bg-(--spx-navy) px-2 py-1 font-mono text-[11px] font-medium tracking-[0.1em] text-white`}>{current.code}</span>}
              </div>
              {current.summary && <p className={`mt-3 max-w-[60ch] text-pretty ${TYPE_S.body} ${C.muted}`}>{current.summary}</p>}
              {(current.conditions.length > 0 || current.procedures.length > 0) && (
                <dl className={`mt-6 grid gap-5 border-t pt-5 ${C.line} ${photo ? '' : '@3xl:grid-cols-2 @3xl:gap-8'}`}>
                  {current.conditions.length > 0 && (
                    <div className="min-w-0">
                      <dt className={`${MONO_LABEL} ${C.muted}`}>Kondisi yang ditangani</dt>
                      <dd className="mt-2.5">
                        <Chips items={current.conditions} label={`Kondisi yang ditangani klinik ${current.tab}`} />
                      </dd>
                    </div>
                  )}
                  {current.procedures.length > 0 && (
                    <div className="min-w-0">
                      <dt className={`${MONO_LABEL} ${C.muted}`}>Pemeriksaan & tindakan</dt>
                      <dd className="mt-2.5">
                        <Chips items={current.procedures} label={`Pemeriksaan dan tindakan klinik ${current.tab}`} />
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
          </div>
          <Schedule m={m} specialty={current} />
        </div>
      </div>
    </TemplateSection>
  );
}

