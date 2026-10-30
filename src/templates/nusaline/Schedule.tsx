// Jadwal keberangkatan (kunci `schedule`), putih. Kepala section, lalu bilah saringan: chip rute (Semua rute + pasangan
// "Jakarta → Surabaya" dari data; aria-pressed; SATU baris selebar layar yang bergulir di kotaknya sendiri dengan pudar di
// kanan — tidak pecah jadi dua baris tak rata; chip yang dipilih dari luar, mis. kartu cari di hero, digulir ke tengah),
// Kelas, Tanggal (tanggal lewat → galat, tidak ikut ke pesan), dan Penumpang (selaras dengan kartu cari di hero dan
// tombol "Pesan kelas ini"). Jumlah hasil diumumkan (role=status, juga tujuan fokus setelah mencari) + "Atur ulang". Tabel
// jadwal asli: Berangkat (mono 24px) · Rute (nama + kode kota) · Tiba (+1 bila besok; dihitung dari jam berangkat +
// durasi) · Durasi · Kelas · Harga mulai · "Pesan" → WhatsApp berisi rute, tanggal, jam + kelas, dan jumlah penumpang.
// HP: tiap baris jadi kartu tiket (jam berangkat ─ bus ─ jam tiba). Baris muncul ulang (≤ 220 ms) hanya setelah saringan
// diganti. Catatan jujur di bawah tabel: jadwal & harga contoh, kursi dikonfirmasi admin lewat WhatsApp.
import { ArrowUpRight, ChevronDown, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { Reveal } from '../shared/Animated';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import {
  ALL_ROUTES,
  PAX_OPTIONS,
  applyScheduleFilter,
  bookingMessage,
  cityCode,
  clampPax,
  dateError,
  filterSummary,
  formatClock,
  formatDuration,
  formatRupiah,
  isFiltered,
  resultCount,
  same,
  spokenDuration,
  todayIso,
  unique,
  type Departure,
  type NusalineModel,
  type ScheduleFilter,
  type ScheduleState,
} from './model';
import { BTN, C, INPUT, LABEL_SM, MONO, SECTION_PAD, WRAP } from './styles';
import { SectionHead } from './ui';

/** Tanpa saringan: 6 baris dulu di layar lebar, 4 di HP (baris 5-6 disembunyikan container query), sisanya lewat tombol. */
const PREVIEW = 6;
const PREVIEW_PHONE = 4;

const CHIP =
  'inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[14px] font-semibold transition-colors duration-200';

export function Schedule({
  m,
  state,
  setFilter,
  setDate,
  setPax,
  statusRef,
}: {
  m: NusalineModel;
  state: ScheduleState;
  setFilter: (f: ScheduleFilter) => void;
  setDate: (date: string) => void;
  setPax: (pax: number) => void;
  statusRef: RefObject<HTMLParagraphElement | null>;
}) {
  const { schedule } = m;
  const baseId = useId();
  const { filter, date, pax, changed } = state;
  const rows = applyScheduleFilter(m.departures, filter);
  const filtered = isFiltered(filter);
  const bookLabel = text(schedule, 'book_label') || 'Pesan';
  const empty = text(schedule, 'empty_text') || 'Belum ada jadwal untuk pilihan ini.';
  const note = text(schedule, 'note');
  // Pilihan kelas: ejaan PERTAMA dipakai (nama di bagian Kelas dulu, = nilai dari "Pesan kelas ini"); nilai terpilih
  // dicocokkan tanpa beda huruf besar-kecil, jadi pilihan selalu sama dengan saringan yang berlaku
  const classes = unique([...m.classList.map((c) => c.name), ...m.departures.map((d) => d.cls)]);
  const clsValue = classes.find((c) => same(c, filter.cls)) ?? '';
  const codeOf = (city: string) => m.stops.find((s) => same(s.city, city))?.code || cityCode(city);
  const signature = `${filter.from}|${filter.to}|${filter.cls}`;
  const routeKey = `${filter.from}|${filter.to}`;
  const allRoutes = !filter.from && !filter.to;
  const [expanded, setExpanded] = useState(false);
  const body = useRef<HTMLTableSectionElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const today = todayIso();
  // Isian tanggal hanya dibatasi atribut `min` (papan ketik / pemilih tanggal iOS bisa melewatinya): tanggal lewat →
  // galat terlihat, dan tidak ikut ke pesan WhatsApp ("belum ditentukan")
  const dateProblem = dateError(date, today);

  // Rute dipilih dari luar (kartu cari di hero, rute di footer) → chip yang tertekan digulir ke tengah rel, tanpa
  // menggulir halaman. Sudah terlihat penuh (di luar pudar 48px kanan) → dibiarkan.
  useEffect(() => {
    const el = rail.current;
    const chip = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!el || !chip || el.scrollWidth <= el.clientWidth) return;
    const left = chip.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left >= el.scrollLeft && right <= el.scrollLeft + el.clientWidth - 48) return;
    el.scrollLeft = Math.max(0, left - (el.clientWidth - chip.offsetWidth) / 2);
  }, [routeKey]);
  const limited = !expanded && !filtered && rows.length > PREVIEW_PHONE;
  const visible = limited ? rows.slice(0, PREVIEW) : rows;
  const showAll = () => {
    // Fokus ke baris pertama yang tadinya tersembunyi (baris ke-5 di HP, ke-7 di layar lebar)
    const items = Array.from(body.current?.children ?? []) as HTMLElement[];
    const hidden = items.findIndex((row) => getComputedStyle(row).display === 'none');
    const first = hidden >= 0 ? hidden : Math.min(PREVIEW, visible.length);
    setExpanded(true);
    window.setTimeout(() => (body.current?.children[first] as HTMLElement | undefined)?.focus(), 0);
  };

  const book = (d: Departure) => {
    const message = bookingMessage({ from: d.from, to: d.to, date, depart: d.depart, cls: d.cls, pax }, m.companyName, today);
    return m.waWith(message) ?? m.sectionAction('contact');
  };

  return (
    <TemplateSection sectionKey="schedule" className={`bg-white ${SECTION_PAD}`}>
      <div className={WRAP}>
        <SectionHead eyebrow={text(schedule, 'eyebrow')} title={text(schedule, 'title')} subtitle={text(schedule, 'subtitle')} srTitle="Jadwal keberangkatan" />

        <Reveal className="mt-10 @3xl:mt-12">
          {m.chips.length > 1 && (
            // Rel selebar layar (melewati jarak tepi WRAP), pudar 48px di kanan; pr-12 di akhir baris = chip terakhir
            // bisa digulir keluar dari pudar
            <div
              ref={rail}
              className="relative -mx-5 overflow-x-auto px-5 pb-1 [mask-image:linear-gradient(90deg,#000_calc(100%-48px),transparent)] [scrollbar-width:none] @2xl:-mx-8 @2xl:px-8 @5xl:-mx-12 @5xl:px-12 @min-[96rem]:-mx-16 @min-[96rem]:px-16"
            >
              <div role="group" aria-label="Pilih rute" className="flex w-max gap-2 pr-12">
                <button
                  type="button"
                  aria-pressed={allRoutes}
                  onClick={() => setFilter({ ...filter, from: '', to: '' })}
                  className={`${CHIP} ${allRoutes ? 'bg-[#0E1230] text-white' : `bg-[#F2F4FA] ${C.ink} hover:bg-[#E6E9F3]`}`}
                >
                  Semua rute
                </button>
                {m.chips.map((chip) => {
                  const pressed = same(filter.from, chip.from) && same(filter.to, chip.to);
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      aria-pressed={pressed}
                      // Nama tombol eksplisit "Jakarta ke Surabaya" (panah dekoratif; teks sr-only bisa menempel jadi "JakartakeSurabaya")
                      aria-label={`${chip.from} ke ${chip.to}`}
                      onClick={() => setFilter({ ...filter, from: chip.from, to: chip.to })}
                      className={`${CHIP} ${pressed ? 'bg-[#0E1230] text-white' : `bg-[#F2F4FA] ${C.ink} hover:bg-[#E6E9F3]`}`}
                    >
                      {chip.from}
                      <span aria-hidden className={pressed ? C.neon : C.accent}>
                        →
                      </span>
                      {chip.to}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 @3xl:flex @3xl:items-end @3xl:gap-4">
            {classes.length > 1 && (
              <div className="col-span-2 min-w-0 @3xl:w-[220px]">
                <label htmlFor={`${baseId}-cls`} className={`mb-1.5 block ${LABEL_SM} ${C.muted}`}>
                  Kelas
                </label>
                <div className="relative">
                  <select id={`${baseId}-cls`} value={clsValue} onChange={(e) => setFilter({ ...filter, cls: e.target.value })} className={`${INPUT} cursor-pointer appearance-none pr-9`}>
                    <option value="">Semua kelas</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDown aria-hidden className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
                </div>
              </div>
            )}
            <div className="min-w-0 @3xl:w-[190px]">
              <label htmlFor={`${baseId}-date`} className={`mb-1.5 block ${LABEL_SM} ${C.muted}`}>
                Tanggal
              </label>
              <input
                id={`${baseId}-date`}
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={dateProblem ? true : undefined}
                aria-describedby={dateProblem ? `${baseId}-date-error` : undefined}
                className={`${INPUT} ${MONO} aria-invalid:ring-2 aria-invalid:ring-(--nl-ink)`}
              />
            </div>
            <div className="min-w-0 @3xl:w-[150px]">
              <label htmlFor={`${baseId}-pax`} className={`mb-1.5 block ${LABEL_SM} ${C.muted}`}>
                Penumpang
              </label>
              <div className="relative">
                <select id={`${baseId}-pax`} value={pax} onChange={(e) => setPax(clampPax(e.target.value))} className={`${INPUT} cursor-pointer appearance-none pr-9`}>
                  {PAX_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} orang
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
              </div>
            </div>
            <div className="col-span-2 flex min-h-11 flex-wrap items-center justify-between gap-x-5 gap-y-1 @3xl:ml-auto @3xl:justify-end">
              {/* role="status" sudah polite; juga tujuan fokus dari kartu cari di hero */}
              <p ref={statusRef} tabIndex={-1} role="status" className={`text-[15px] focus:outline-none ${C.muted}`}>
                <span className={`font-semibold ${C.ink}`}>{resultCount(rows.length)}</span>
                {rows.length > 0 && <span> · {filterSummary(filter)}</span>}
              </p>
              {filtered && (
                <button
                  type="button"
                  onClick={() => setFilter(ALL_ROUTES)}
                  className={`inline-flex min-h-11 items-center gap-2 text-[14px] font-semibold underline decoration-[#0E1230]/30 underline-offset-[5px] transition-colors hover:text-(--nl-ink) ${C.ink}`}
                >
                  <RotateCcw aria-hidden className="h-3.5 w-3.5" />
                  Atur ulang
                </button>
              )}
            </div>
          </div>
          {/* Galat tanggal di bawah bilah (isian lain tetap sejajar); dihubungkan ke isian lewat aria-describedby */}
          {dateProblem && (
            <p id={`${baseId}-date-error`} className="mt-2 text-[13px] font-medium text-(--nl-ink)">
              {dateProblem}
            </p>
          )}
        </Reveal>

        {rows.length > 0 ? (
          // Tablet & layar lebar: tabel asli; nama rute/kelas CMS yang panjang membuatnya bergulir di wadahnya sendiri,
          // bukan melebarkan halaman (di 768px tabel ±870px dulu menggeser seluruh halaman ke samping)
          <Reveal className="mt-6 @3xl:mt-8 @3xl:overflow-x-auto">
            <table role="table" className="block w-full border-collapse text-left @3xl:table">
              <caption className="sr-only">Jadwal keberangkatan: {filterSummary(filter)}</caption>
              <thead role="rowgroup" className="hidden @3xl:table-header-group">
                <tr role="row" className={`border-b ${C.line}`}>
                  {['Berangkat', 'Rute', 'Tiba', 'Durasi', 'Kelas', 'Harga mulai'].map((h) => (
                    <th key={h} role="columnheader" scope="col" className={`py-3 pr-4 font-normal ${LABEL_SM} ${C.muted}`}>
                      {h}
                    </th>
                  ))}
                  <th role="columnheader" scope="col" className="py-3">
                    <span className="sr-only">Pesan</span>
                  </th>
                </tr>
              </thead>
              <tbody ref={body} role="rowgroup" key={signature} data-filtered={changed ? 'true' : 'false'} className="grid gap-3 @3xl:table-row-group">
                {visible.map((d, i) => {
                  const route = `${d.from} → ${d.to}`;
                  const action = book(d);
                  return (
                    <tr
                      key={d.index}
                      role="row"
                      tabIndex={-1}
                      // HP: kolom 1 selebar jam berangkat saja — chip kelas (baris 3) melintasi kolom tengah (1fr), jadi tidak ikut
                      // menentukan lebar kolom itu; di bawah 24rem harga juga melintasi semua kolom (baris sendiri). Dulu chip kelas
                      // ("Super Eksekutif", ±130px) melebarkan kolom 1 dan harga kolom 2–3, kolom durasi menyempit sampai 0 di HP
                      // 320px: "26j 00m" menimpa jam tiba dan "Rp760.000" keluar dari kartu.
                      className={`nl-row relative focus:outline-none ${limited && i >= PREVIEW_PHONE ? 'hidden' : 'grid'} grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-3 rounded-[18px] bg-[#F2F4FA] p-4 @min-[24rem]:gap-x-3 @3xl:table-row @3xl:rounded-none @3xl:border-b @3xl:bg-transparent @3xl:p-0 ${C.line}`}
                      style={{ '--nl-delay': `${Math.min(i, 8) * 28}ms` } as CSSProperties}
                    >
                      <td role="cell" className={`col-start-1 row-start-1 ${MONO} text-[24px] font-semibold leading-none tracking-[-0.02em] ${C.ink} @3xl:py-5 @3xl:pr-4 @3xl:text-[26px]`}>
                        <span className="sr-only">Berangkat </span>
                        {formatClock(d.depart)}
                      </td>
                      <td role="cell" className="col-span-3 row-start-2 min-w-0 @3xl:py-5 @3xl:pr-4">
                        <span className={`block text-[15px] font-semibold ${C.ink}`}>{route}</span>
                        <span aria-hidden className={`mt-0.5 block ${MONO} text-[12px] ${C.muted}`}>
                          {codeOf(d.from)} → {codeOf(d.to)}
                        </span>
                      </td>
                      <td role="cell" className={`col-start-3 row-start-1 justify-self-end ${MONO} text-[24px] font-semibold leading-none tracking-[-0.02em] ${C.ink} @3xl:py-5 @3xl:pr-4 @3xl:text-[20px]`}>
                        {d.arrive === null ? (
                          <span className={`text-[15px] font-medium ${C.muted}`}>–</span>
                        ) : (
                          <>
                            <span className="sr-only">Tiba </span>
                            {formatClock(d.arrive)}
                            {d.days > 0 && (
                              <sup className="ml-1 rounded-full bg-(--tpl-accent-100) px-1.5 py-0.5 align-super text-[11px] font-semibold text-(--nl-ink)">
                                +{d.days}
                                <span className="sr-only"> hari</span>
                              </sup>
                            )}
                          </>
                        )}
                      </td>
                      <td role="cell" className={`col-start-2 row-start-1 min-w-0 text-center @3xl:py-5 @3xl:pr-4 @3xl:text-left`}>
                        {/* HP: garis tiket bertitik dengan bus kecil di tengah, durasi di atasnya */}
                        <span className={`block ${MONO} text-[12px] ${C.muted} @3xl:text-[14px]`}>
                          <span aria-hidden>{formatDuration(d.duration) || '–'}</span>
                          <span className="sr-only">{d.duration ? `Durasi ${spokenDuration(d.duration)}` : 'Durasi belum diisi'}</span>
                        </span>
                        <span aria-hidden className="relative mt-1.5 block h-px border-t border-dashed border-[#0E1230]/30 @3xl:hidden">
                          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-(--tpl-accent)" />
                        </span>
                      </td>
                      {/* Sel kelas mengisi kolom 1–2 (tanpa justify-self-start): lebarnya pasti, jadi max-w-full chip benar-benar
                          memotong nama kelas panjang (…) sebelum kolom harga — sel yang menyusut ke isinya ikut melebar */}
                      <td role="cell" className="col-span-2 col-start-1 row-start-3 min-w-0 @3xl:py-5 @3xl:pr-4">
                        {d.cls && (
                          <span className="inline-flex h-7 max-w-full items-center whitespace-nowrap rounded-full bg-white px-2.5 font-mono text-[12px] font-medium text-[#0E1230] ring-1 ring-inset ring-[#0E1230]/15 @3xl:bg-[#F2F4FA] @3xl:ring-0">
                            <span className="truncate">{d.cls}</span>
                          </span>
                        )}
                      </td>
                      {/* HP < 24rem (320–383px): kelas dan harga tidak muat sebaris (±130 + 140px di kartu 248px) → harga baris
                          sendiri di bawah chip kelas. ≥ 24rem sebaris: harga di kolom 3 saja (kolom jam tiba selebar harga),
                          chip kelas di kolom 1–2 dan dipotong (…) di sana — nama kelas CMS yang panjang tidak menimpa harga */}
                      <td role="cell" className="col-start-3 row-start-3 justify-self-end text-right @max-[24rem]:col-span-3 @max-[24rem]:col-start-1 @max-[24rem]:row-start-4 @max-[24rem]:justify-self-start @max-[24rem]:text-left @3xl:py-5 @3xl:pr-4 @3xl:text-left">
                        {d.price > 0 ? (
                          <span className="inline-flex items-baseline gap-1.5">
                            <span className={`text-[12px] ${C.muted} @3xl:hidden`}>mulai</span>
                            <span className={`${MONO} text-[17px] font-semibold ${C.ink}`}>{formatRupiah(d.price)}</span>
                          </span>
                        ) : (
                          <span className={`text-[14px] ${C.muted}`}>Tanya admin</span>
                        )}
                      </td>
                      <td role="cell" className="col-span-3 row-start-4 @max-[24rem]:row-start-5 @3xl:py-4 @3xl:text-right">
                        {action && (
                          <ActionLink
                            action={action}
                            aria-label={`${bookLabel}: ${route} ${formatClock(d.depart)}${d.cls ? ` ${d.cls}` : ''}${action.kind === 'external' ? ' (WhatsApp)' : ''}`}
                            className={`${BTN.outline} ${BTN.md} w-full @3xl:w-auto`}
                          >
                            {bookLabel}
                            <ArrowUpRight aria-hidden className="h-4 w-4" />
                          </ActionLink>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {limited && (
              <div className={`mt-6 flex justify-center ${rows.length <= PREVIEW ? '@3xl:hidden' : ''}`}>
                <button type="button" onClick={showAll} className={`${BTN.ghost} ${BTN.lg} w-full @xl:w-auto`}>
                  Lihat semua {rows.length} jadwal
                  <ChevronDown aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}
          </Reveal>
        ) : (
          <div className={`mt-6 rounded-[18px] border border-dashed px-6 py-12 text-center @3xl:mt-8 ${C.line}`}>
            <p className={`mx-auto max-w-[36ch] text-[17px] font-semibold ${C.ink}`}>{empty}</p>
            <button
              type="button"
              onClick={() => setFilter(ALL_ROUTES)}
              className={`mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold underline decoration-[#0E1230]/35 underline-offset-[6px] transition-colors hover:text-(--nl-ink) ${C.ink}`}
            >
              <RotateCcw aria-hidden className="h-4 w-4" />
              Lihat semua jadwal
            </button>
          </div>
        )}
        {note && <p className={`mt-5 text-[13px] ${C.muted}`}>{note}</p>}
      </div>
    </TemplateSection>
  );
}
