// Jadwal dokter (kunci `doctors`), latar kertas. Kepala section, lalu bilah saring: pilihan Poli (select) + chip Hari
// (radio: Semua, Sen … Min), jumlah hasil di wilayah live, dan TABEL putih radius 12: Dokter (avatar INISIAL, tanpa
// foto), Poli, Hari praktik, Jam, tombol "Daftar". Layar ≥ @3xl tabel biasa bergaris tipis; HP setiap baris jadi kartu
// bertumpuk (peran ARIA tabel dipasang eksplisit agar tetap terbaca sebagai tabel). "Daftar" mengisi poli & dokter di
// formulir pendaftaran lalu menggulir ke sana (tanpa formulir: WhatsApp dengan pesan berisi nama dokter). Baris naik
// pelan berurutan saat tabel masuk layar / saring berganti (./medicare-general.css, .mc-row). Data jadwal = contoh dari
// CMS; catatan di bawah tabel mengingatkan jadwal dikonfirmasi petugas.
import { CalendarX2, ChevronDown, Info } from 'lucide-react';
import { useContext, useId, useRef, useState, type CSSProperties } from 'react';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { TemplateSection } from '../shared/Shell';
import { useTemplateRuntime } from '../shared/runtime';
import { field, text } from '../shared/utils';
import { RegistrationPickContext, usePlayOnce } from './hooks';
import { DAY_NAMES, DAY_SHORT, doctorInitials, filterDoctors, uniquePolis, type MedicareModel } from './model';
import { BTN, C, INPUT, SECTION_PAD, T } from './styles';
import { ButtonLink, SectionHead } from './ui';

/** Baris yang tampil sebelum "Tampilkan semua jadwal" (daftar ≤ 8 tampil utuh). */
const ROW_LIMIT = 6;

export function Doctors({ m }: { m: MedicareModel }) {
  const { doctors: section } = m;
  const doctors = m.items('doctors');
  const baseId = useId();
  const [poli, setPoli] = useState('');
  const [day, setDay] = useState(-1);
  const [expanded, setExpanded] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const { choose } = useContext(RegistrationPickContext);
  const { goTo } = useTemplateRuntime();
  usePlayOnce(tableRef);

  const polis = uniquePolis(doctors.map((doc) => field(doc, 'poli')));
  const rows = filterDoctors(doctors, { poli, day });
  const canCollapse = rows.length > ROW_LIMIT + 2;
  const visible = canCollapse && !expanded ? rows.slice(0, ROW_LIMIT) : rows;
  const canRegister = m.shown('registration');
  const note = text(section, 'note');
  const status =
    rows.length === 0
      ? 'Tidak ada jadwal untuk pilihan ini'
      : visible.length < rows.length
        ? `Menampilkan ${visible.length} dari ${rows.length} jadwal dokter`
        : `Menampilkan ${rows.length} jadwal dokter`;

  const register = (doc: (typeof doctors)[number]) => {
    choose(field(doc, 'poli'), field(doc, 'name'));
    goTo('registration');
  };

  const head = `px-5 py-4 font-semibold ${T.small} ${C.muted}`;
  return (
    <TemplateSection sectionKey="doctors" className={`${SECTION_PAD} ${C.paper}`}>
      <div className={CONTAINER}>
        <SectionHead eyebrow={text(section, 'eyebrow')} title={text(section, 'title')} subtitle={text(section, 'subtitle')} srTitle="Jadwal dokter" />

        <div className="mt-10 grid gap-6 @3xl:mt-12 @5xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)] @5xl:items-end @5xl:gap-8">
          <div className="min-w-0">
            <label htmlFor={`${baseId}-poli`} className={`mb-2 block font-semibold ${T.body} ${C.ink}`}>
              Poli
            </label>
            <div className="relative">
              <select id={`${baseId}-poli`} value={poli} onChange={(e) => setPoli(e.target.value)} className={`${INPUT} appearance-none pr-12`}>
                <option value="">Semua poli</option>
                {polis.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className={`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 ${C.muted}`} />
            </div>
          </div>
          <fieldset className="min-w-0">
            <legend className={`mb-2 font-semibold ${T.body} ${C.ink}`}>Hari praktik</legend>
            <div className="grid grid-cols-4 gap-2 @2xl:flex @2xl:flex-wrap">
              {[-1, 0, 1, 2, 3, 4, 5, 6].map((d) => (
                <label
                  key={d}
                  className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-[10px] bg-white px-3 font-semibold ring-1 ring-inset ring-[#0E1B2E]/40 transition-colors has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) @2xl:min-w-14 ${T.small} ${C.ink}`}
                >
                  <input type="radio" name={`${baseId}-day`} value={d} checked={day === d} onChange={() => setDay(d)} className="sr-only" />
                  <span aria-hidden>{d < 0 ? 'Semua' : DAY_SHORT[d]}</span>
                  <span className="sr-only">{d < 0 ? 'Semua hari' : DAY_NAMES[d]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <p aria-live="polite" className={`mt-8 font-semibold ${T.small} ${C.muted}`}>
          {status}
        </p>

        <div ref={tableRef} id={`${baseId}-table`} className="mt-3 overflow-hidden rounded-[12px] bg-white ring-1 ring-inset ring-[#0E1B2E]/[0.1]">
          {rows.length > 0 ? (
            <table role="table" className="block w-full border-collapse text-left @3xl:table">
              <caption className="sr-only">Jadwal praktik dokter</caption>
              <thead role="rowgroup" className="sr-only @3xl:not-sr-only @3xl:table-header-group">
                <tr role="row" className={`border-b ${C.line} bg-[#F8FAFD]`}>
                  <th role="columnheader" scope="col" className={head}>
                    Dokter
                  </th>
                  <th role="columnheader" scope="col" className={head}>
                    Poli
                  </th>
                  <th role="columnheader" scope="col" className={head}>
                    Hari praktik
                  </th>
                  <th role="columnheader" scope="col" className={head}>
                    Jam
                  </th>
                  <th role="columnheader" scope="col" className={head}>
                    <span className="sr-only">Pendaftaran</span>
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="block divide-y divide-[#0E1B2E]/[0.1] @3xl:table-row-group">
                {visible.map((doc, i) => {
                  const name = field(doc, 'name');
                  const doctorPoli = field(doc, 'poli');
                  const days = field(doc, 'days');
                  const hours = field(doc, 'hours');
                  return (
                    <tr
                      role="row"
                      key={`${name}-${doctorPoli}-${i}`}
                      style={{ '--mc-at': `${stagger(i, 50)}ms` } as CSSProperties}
                      className="mc-row grid grid-cols-[48px_minmax(0,1fr)_auto] gap-x-3.5 gap-y-2 px-4 py-4 @2xl:gap-x-4 @2xl:px-5 @3xl:table-row @3xl:p-0"
                    >
                      {/* HP: avatar | nama + poli (dua kolom) / hari & jam | Daftar. Layar lebar: sel tabel biasa. */}
                      <td role="cell" className="contents @3xl:table-cell @3xl:px-5 @3xl:py-4 @3xl:align-middle">
                        <span className="row-span-2 flex self-start @3xl:inline-flex @3xl:items-center @3xl:gap-4">
                          <span
                            aria-hidden
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-(--tpl-accent-50) text-[16px] font-bold text-(--tpl-accent-ink)"
                          >
                            {doctorInitials(name)}
                          </span>
                          <span className={`hidden font-semibold @3xl:inline ${T.body} ${C.ink}`}>{name}</span>
                        </span>
                        <span className="col-span-2 min-w-0 @3xl:hidden">
                          <span className={`block font-semibold ${T.body} ${C.ink}`}>{name}</span>
                          {doctorPoli && <span className={`block ${T.small} text-(--tpl-accent-ink)`}>{doctorPoli}</span>}
                        </span>
                        <span className={`col-start-2 min-w-0 self-center @3xl:hidden ${T.small} ${C.ink}`}>
                          <span className="block">{days || '–'}</span>
                          <span className="block tabular-nums">{hours || '–'}</span>
                        </span>
                      </td>
                      <td role="cell" className={`hidden @3xl:table-cell @3xl:px-5 @3xl:py-4 @3xl:align-middle ${T.body} ${C.ink}`}>
                        {doctorPoli}
                      </td>
                      <td role="cell" className={`hidden @3xl:table-cell @3xl:px-5 @3xl:py-4 @3xl:align-middle ${T.body} ${C.ink}`}>
                        {days || '–'}
                      </td>
                      <td role="cell" className={`hidden tabular-nums @3xl:table-cell @3xl:whitespace-nowrap @3xl:px-5 @3xl:py-4 @3xl:align-middle ${T.body} ${C.ink}`}>
                        {hours || '–'}
                      </td>
                      <td role="cell" className="col-start-3 row-start-2 self-center @3xl:table-cell @3xl:px-5 @3xl:py-3 @3xl:text-right @3xl:align-middle">
                        {canRegister ? (
                          <button
                            type="button"
                            onClick={() => register(doc)}
                            aria-label={`Daftar ke ${name}`}
                            className={`${BTN.outline} min-h-12! px-4! @3xl:px-5!`}
                          >
                            Daftar
                          </button>
                        ) : (
                          <ButtonLink
                            action={m.waWith(`Halo ${m.companyName}, saya ingin mendaftar ke ${name} (${doctorPoli}).`)}
                            label="Daftar"
                            ariaLabel={`Daftar ke ${name} lewat WhatsApp`}
                            variant="outline"
                            className="min-h-12! px-4! @3xl:px-5!"
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-start gap-4 p-6 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:p-8">
              <p className={`flex items-center gap-3 ${T.body} ${C.ink}`}>
                <CalendarX2 aria-hidden className="h-6 w-6 shrink-0 text-(--tpl-accent-ink)" />
                Tidak ada dokter yang praktik pada pilihan ini.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPoli('');
                  setDay(-1);
                }}
                className={BTN.outline}
              >
                Tampilkan semua jadwal
              </button>
            </div>
          )}
        </div>

        {canCollapse && (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={`${baseId}-table`}
            onClick={() => setExpanded((v) => !v)}
            className={`${BTN.outline} mt-4 w-full @xl:w-auto`}
          >
            {expanded ? 'Tampilkan lebih sedikit' : `Tampilkan semua jadwal (${rows.length} dokter)`}
          </button>
        )}

        {note && (
          <p className={`mt-5 flex items-start gap-2.5 ${T.small} ${C.muted}`}>
            <Info aria-hidden className="mt-[0.2em] h-4 w-4 shrink-0" />
            {note}
          </p>
        )}
      </div>
    </TemplateSection>
  );
}
