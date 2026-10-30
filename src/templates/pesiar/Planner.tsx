// Rancang tur sendiri (kunci `planner`, pita PUTIH). Kiri (1-7): kepala section, chip tempat tujuan (tombol
// aria-pressed, maks. 5; nama + area + "± 1,5 jam", nomor urut saat dipilih; penuh → chip lain aria-disabled + pesan),
// area jemput, tanggal (tidak sebelum hari ini), dan pilihan mobil (radio dalam lintasan pil; nama panjang boleh dua
// baris, 4 mobil = 2 × 2 di HP). Kanan (8-12): panel HIJAU TUA "Rute Anda" (menempel saat digulir di layar lebar) bergaya
// rencana perjalanan: nomor dalam lingkaran bergaris aksen terang yang disambung garis putus-putus (bahasa rute film
// peta), masuk bergeser ≤ 250 ms, tombol naik/turun/hapus 44px (fokus pindah ke tombol yang masih ada), perkiraan durasi
// "± 9 jam" dengan bilah terhadap paket 10 jam, perkiraan harga per mobil (bergerak ke nilai baru ± 450 ms), rumus
// singkat, tombol "Kirim ke WhatsApp", catatan jujur. Kirim → validasi (≥ 1 tempat, tanggal) → pesan ditampilkan apa
// adanya + "Buka WhatsApp" / "Ubah". Pesan itu milik isian saat dikirim: begitu tempat, urutan, area, tanggal, atau mobil
// berubah (juga lewat "Ubah rute" di kartu tur) panel kembali ke perkiraan, jadi tidak ada pesan lama yang terkirim.
// JUJUR: hanya MENYUSUN pesan — tidak ada fetch, localStorage, <form action>, atau pembayaran; harga = perkiraan per
// mobil (paket + jam tambahan).
import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, Lock, PencilLine, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { useMotionEnabled } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { text } from '../shared/utils';
import { focusField, useTween } from './hooks';
import {
  MAX_STOPS,
  NBSP,
  formatDecimal,
  formatHours,
  formatRupiah,
  messageMailHref,
  moveStop,
  planEstimate,
  plannerMessage,
  toggleStop,
  todayIso,
  validatePlanner,
  type Destination,
  type PesiarModel,
  type PlannerErrors,
} from './model';
import { BTN, C, FOCUS_SCROLL, GRID_GAP, INPUT, SECTION_PAD, SERIF, TYPE, WRAP } from './styles';
import { FieldError, SectionHead } from './ui';

const ICON_BUTTON =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#F5EFE6]/85 ring-1 ring-inset ring-[#F5EFE6]/25 transition-colors hover:bg-[#F5EFE6]/10 hover:text-[#F5EFE6] disabled:opacity-35 disabled:hover:bg-transparent';

/** Lintasan pilihan mobil: 1–3 mobil satu baris; 4 mobil = 2 × 2 di HP, satu baris mulai @xl. */
const CAR_TRACK: Record<number, string> = {
  1: 'grid-cols-1 rounded-full',
  2: 'grid-cols-2 rounded-full',
  3: 'grid-cols-3 rounded-full',
  4: 'grid-cols-2 rounded-[26px] @xl:grid-cols-4 @xl:rounded-full',
};

/** Tombol tampil (bukan display:none, mis. "ke bawah" disembunyikan di HP) dan tidak nonaktif → bisa difokus. */
const focusable = (el: HTMLElement | null | undefined): el is HTMLElement =>
  !!el && !(el as HTMLButtonElement).disabled && el.isConnected && getComputedStyle(el).display !== 'none';

export function Planner({ m, stops, setStops, focusKey }: { m: PesiarModel; stops: string[]; setStops: (next: string[]) => void; focusKey: number }) {
  const { planner } = m;
  const baseId = useId();
  const [today] = useState(() => todayIso());
  const [pickup, setPickup] = useState(m.pickups[0] ?? '');
  const [date, setDate] = useState('');
  const [car, setCar] = useState(0);
  const [errors, setErrors] = useState<PlannerErrors>({});
  const [notice, setNotice] = useState('');
  const [sent, setSent] = useState<{ text: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const chipsRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const routeHeading = useRef<HTMLHeadingElement>(null);
  const finalRef = useRef<HTMLSpanElement>(null);
  const runRef = useRef<HTMLSpanElement>(null);
  /** Tombol baris rute per "id:aksi" (aksi up / down / remove), untuk memindahkan fokus setelah urutan berubah */
  const rowButtons = useRef(new Map<string, HTMLButtonElement | null>());
  /** Calon fokus berurutan setelah render berikutnya ("chips" = chip pertama) */
  const pendingFocus = useRef<string[] | null>(null);
  const firstFocusKey = useRef(focusKey);
  const motion = useMotionEnabled();

  const destinations = m.destinations;
  const cars = m.cars;
  const chosen = stops.map((id) => destinations.find((d) => d.id === id)).filter((d): d is Destination => !!d);
  const carIndex = Math.min(car, Math.max(0, cars.length - 1));
  const selectedCar = cars[carIndex] ?? null;
  const estimate = planEstimate(chosen, selectedCar, m.settings);
  useTween(finalRef, runRef, estimate.price, formatRupiah, motion);

  // Pesan yang sudah disusun hanya berlaku untuk isian saat itu (termasuk "Ubah rute" dari kartu tur = focusKey baru)
  const signature = [focusKey, stops.join('|'), pickup, date, carIndex].join('#');
  if (sent && sent.key !== signature) setSent(null);
  const message = sent && sent.key === signature ? sent.text : null;

  // Setelah pindah/hapus: fokus ke tombol yang masih ada (bukan hilang ke <body> atau tertinggal di tombol nonaktif)
  useEffect(() => {
    const keys = pendingFocus.current;
    if (!keys) return;
    pendingFocus.current = null;
    for (const key of keys) {
      const el = key === 'chips' ? chipsRef.current?.querySelector<HTMLButtonElement>('button') : rowButtons.current.get(key);
      if (focusable(el)) {
        el.focus();
        return;
      }
    }
  });

  // "Ubah rute" di kartu tur: halaman menggulir ke sini, fokus pindah ke judul "Rute Anda" (Tab berikutnya = daftar rute)
  useEffect(() => {
    if (focusKey === firstFocusKey.current) return;
    routeHeading.current?.focus({ preventScroll: true });
  }, [focusKey]);

  const rowRef = (key: string) => (el: HTMLButtonElement | null) => {
    rowButtons.current.set(key, el);
  };

  const move = (d: Destination, dir: -1 | 1) => {
    setStops(moveStop(stops, stops.indexOf(d.id), dir));
    // Di ujung daftar tombol yang ditekan menjadi nonaktif → tombol arah lain, lalu hapus
    const same = `${d.id}:${dir === -1 ? 'up' : 'down'}`;
    const other = `${d.id}:${dir === -1 ? 'down' : 'up'}`;
    pendingFocus.current = [same, other, `${d.id}:remove`];
  };

  const remove = (d: Destination, i: number) => {
    setStops(toggleStop(stops, d.id));
    const next = chosen[i + 1] ?? chosen[i - 1];
    pendingFocus.current = next ? [`${next.id}:remove`] : ['chips'];
  };

  const full = chosen.length >= MAX_STOPS;
  const id = (key: string) => `${baseId}-${key}`;
  const buttonLabel = text(planner, 'button_label') || 'Kirim ke WhatsApp';
  const note = text(planner, 'note') || 'Formulir hanya menyusun pesan WhatsApp; harga contoh per mobil. Tidak ada pembayaran online.';
  const ratio = estimate.baseHours > 0 ? Math.min(1, estimate.hours / estimate.baseHours) : 0;

  const toggle = (dest: Destination) => {
    const pressed = stops.includes(dest.id);
    if (!pressed && full) {
      setNotice(`Maksimal ${MAX_STOPS} tempat. Hapus satu tempat untuk menambah ${dest.name}.`);
      return;
    }
    setNotice('');
    setStops(toggleStop(stops, dest.id));
    if (errors.stops) setErrors((e) => ({ ...e, stops: undefined }));
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = { stops, pickup, date, car: carIndex };
    const found = validatePlanner(form, destinations, todayIso());
    setErrors(found);
    if (found.stops) {
      focusField(chipsRef.current?.querySelector<HTMLButtonElement>('button'));
      return;
    }
    if (found.date) {
      focusField(dateRef.current);
      return;
    }
    setCopied(false);
    setSent({ text: plannerMessage(form, destinations, cars, m.settings, m.companyName), key: signature });
    window.setTimeout(() => focusField(resultHeading.current), 0);
  };

  const panel = 'rounded-[28px] bg-[#17332B] px-5 py-6 text-[#F5EFE6] @3xl:px-8 @3xl:py-8';
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.onDeepMuted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  let result;
  if (message) {
    const wa = m.waWith(message);
    const mail = !wa ? messageMailHref(text(m.contact, 'email'), 'Tur pribadi', message) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(message);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    result = (
      <div data-tpl-tone="inverse" className={panel} aria-live="polite">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 ${TYPE.h3} ${FOCUS_SCROLL} focus:outline-none`}>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.onDeepMuted}`}>Periksa isinya, lalu kirim. Pesan belum terkirim sebelum Anda menekan kirim.</p>
        <pre className="mt-5 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[16px] bg-[#F5EFE6]/[0.07] p-4 font-sans text-[14px] leading-relaxed text-[#F5EFE6] ring-1 ring-inset ring-[#F5EFE6]/15 [overflow-wrap:anywhere]">
          {message}
        </pre>
        <div className="mt-6 flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center @xl:gap-5">
          {wa ? (
            <ActionLink action={wa} className={`${BTN.primary} ${BTN.lg}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          ) : mail ? (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.primary} ${BTN.lg}`}>
              Kirim lewat email
            </ActionLink>
          ) : (
            <button type="button" onClick={copy} className={`${BTN.primary} ${BTN.lg}`}>
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? 'Tersalin' : 'Salin pesan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => focusField(chipsRef.current?.querySelector<HTMLButtonElement>('button')), 0);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 text-[15px] font-medium text-[#F5EFE6] underline decoration-[#F5EFE6]/50 underline-offset-[6px]"
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah rute
          </button>
        </div>
        {privacy}
      </div>
    );
  } else {
    result = (
      <div data-tpl-tone="inverse" className={panel}>
        <div className="flex items-baseline justify-between gap-4">
          <h3 ref={routeHeading} tabIndex={-1} className={`${TYPE.h3} ${FOCUS_SCROLL} focus:outline-none`}>
            Rute Anda
          </h3>
          <p className={`text-[13px] tabular-nums ${C.onDeepMuted}`}>
            {chosen.length}/{MAX_STOPS} tempat
          </p>
        </div>
        {chosen.length > 0 ? (
          // Rencana perjalanan: nomor dalam lingkaran disambung garis putus-putus aksen terang (seperti rute di film peta)
          <div key={focusKey} className="relative mt-5">
            {chosen.length > 1 && <span aria-hidden className="absolute bottom-[30px] left-[13.5px] top-[30px] border-l-[1.5px] border-dashed border-(--ps-bright)" />}
            <ol className="relative">
              {chosen.map((d, i) => (
                <li key={d.id} className="ps-stop relative flex items-center gap-3 py-2">
                  <span
                    aria-hidden
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#17332B] ring-[1.5px] ring-(--ps-bright) ${SERIF} text-[15px] font-medium leading-none tabular-nums ${C.bright}`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15.5px] font-semibold">{d.name}</span>
                    {/* Jam dulu (selalu utuh), lalu area (boleh terpotong di HP) */}
                    <span className={`block truncate text-[13px] ${C.onDeepMuted}`}>
                      {formatHours(d.hours)}
                      {d.area ? ` · ${d.area}` : ''}
                    </span>
                  </span>
                  <button type="button" ref={rowRef(`${d.id}:up`)} onClick={() => move(d, -1)} disabled={i === 0} aria-label={`Pindahkan ${d.name} ke atas`} className={ICON_BUTTON}>
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    ref={rowRef(`${d.id}:down`)}
                    onClick={() => move(d, 1)}
                    disabled={i === chosen.length - 1}
                    aria-label={`Pindahkan ${d.name} ke bawah`}
                    className={`${ICON_BUTTON} hidden @xl:flex`}
                  >
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </button>
                  <button type="button" ref={rowRef(`${d.id}:remove`)} onClick={() => remove(d, i)} aria-label={`Hapus ${d.name} dari rute`} className={ICON_BUTTON}>
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className={`mt-5 rounded-[16px] border border-dashed border-[#F5EFE6]/30 px-4 py-6 text-center text-[14.5px] ${C.onDeepMuted}`}>
            Pilih tempat di daftar untuk mulai menyusun rute.
          </p>
        )}

        <dl className="mt-6 grid gap-5">
          <div>
            <dt className={`text-[13px] ${C.onDeepMuted}`}>Perkiraan durasi</dt>
            <dd className="mt-1">
              <span className={`${SERIF} text-[30px] font-medium leading-none tabular-nums`}>{estimate.hours > 0 ? formatHours(estimate.hours) : `–`}</span>
              <span className={`ml-2 text-[13.5px] ${C.onDeepMuted}`}>
                dari paket {estimate.baseHours}
                {NBSP}jam
              </span>
              <span aria-hidden className="mt-3 block h-1.5 overflow-hidden rounded-full bg-[#F5EFE6]/15">
                <span className="ps-bar block h-full origin-left rounded-full bg-(--ps-bright)" style={{ transform: `scaleX(${ratio})` }} />
              </span>
              {estimate.extraHours > 0 && (
                <span className={`mt-2 block text-[13px] ${C.bright}`}>
                  +{estimate.extraHours}
                  {NBSP}jam tambahan
                </span>
              )}
            </dd>
          </div>
          {selectedCar && selectedCar.price > 0 && (
            <div>
              <dt className={`text-[13px] ${C.onDeepMuted}`}>Perkiraan harga per mobil · {selectedCar.name}</dt>
              <dd className="mt-1">
                <span className="grid text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums @3xl:text-[40px]">
                  <span ref={finalRef} className="col-start-1 row-start-1">
                    {estimate.price > 0 ? formatRupiah(estimate.price) : formatRupiah(selectedCar.price)}
                  </span>
                  <span ref={runRef} aria-hidden className="col-start-1 row-start-1" />
                </span>
                <span className={`mt-2 block text-[13px] leading-snug ${C.onDeepMuted}`}>
                  Paket {estimate.baseHours}
                  {NBSP}jam {formatRupiah(selectedCar.price)}
                  {selectedCar.overtime > 0 && ` · lebih dari itu +${formatRupiah(selectedCar.overtime)}/jam`}
                </span>
              </dd>
            </div>
          )}
        </dl>
        <p className="sr-only" aria-live="polite">
          {chosen.length > 0 ? `Perkiraan ${formatDecimal(estimate.hours)} jam${estimate.price > 0 ? `, ${formatRupiah(estimate.price)} per mobil` : ''}` : ''}
        </p>
        <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-7 w-full`}>
          {m.whatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
          {buttonLabel}
        </button>
        {privacy}
      </div>
    );
  }

  return (
    <TemplateSection sectionKey="planner" className={`${SECTION_PAD} ${C.white}`}>
      <form noValidate onSubmit={onSubmit} aria-label="Rancang tur" className={`${WRAP} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
        {/* 1024–1279px: 6/6 (panel hasil cukup lebar, chip 2 kolom tanpa "…"); ≥ 1280px: 7/5 */}
        <div className="min-w-0 @5xl:col-span-6 @7xl:col-span-7">
          <SectionHead layout="stack" number={m.number('planner')} eyebrow={text(planner, 'eyebrow')} title={text(planner, 'title')} subtitle={text(planner, 'subtitle')} srTitle="Rancang tur sendiri" />
          <Reveal className="mt-10">
            <div className="grid gap-8">
              <div>
                <p id={id('places')} className={`${TYPE.field} ${C.ink}`}>
                  Tempat tujuan <span className={`font-normal ${C.muted}`}>(maks. {MAX_STOPS})</span>
                </p>
                <div
                  ref={chipsRef}
                  role="group"
                  aria-labelledby={id('places')}
                  aria-describedby={errors.stops ? id('stops-error') : undefined}
                  className="mt-3 grid grid-cols-2 gap-2 @3xl:grid-cols-3 @3xl:gap-2.5 @5xl:grid-cols-2 @7xl:grid-cols-3"
                >
                  {destinations.map((d) => {
                    const order = stops.indexOf(d.id);
                    const pressed = order >= 0;
                    const blocked = !pressed && full;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={pressed}
                        aria-disabled={blocked || undefined}
                        onClick={() => toggle(d)}
                        className={`ps-chip group/chip relative flex min-h-[60px] min-w-0 items-start gap-2.5 rounded-[18px] px-3.5 py-3 text-left ring-1 ring-inset transition-colors duration-200 @max-sm:px-3 ${FOCUS_SCROLL} ${
                          pressed
                            ? 'bg-(--tpl-accent) text-(--tpl-on-accent) ring-(--tpl-accent)'
                            : blocked
                              ? 'cursor-not-allowed bg-white text-[#1E2622]/55 ring-[#1E2622]/15'
                              : 'bg-white text-[#1E2622] ring-[#1E2622]/20 hover:ring-[#1E2622]/50'
                        }`}
                      >
                        {/* HP < 384px: nomor urut pindah ke pojok kanan bawah (hanya saat dipilih) agar nama tempat utuh */}
                        <span
                          aria-hidden
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums @max-sm:absolute @max-sm:bottom-2.5 @max-sm:right-2.5 @max-sm:mt-0 ${
                            pressed ? 'bg-(--tpl-on-accent) text-(--tpl-accent)' : 'ring-1 ring-inset ring-[#1E2622]/30 @max-sm:hidden'
                          }`}
                        >
                          {pressed ? order + 1 : ''}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[15px] font-semibold leading-tight">{d.name}</span>
                          {/* Jam selalu utuh; area hanya bila chip cukup lebar (HP: chip sempit, area terpotong tidak rapi) */}
                          <span className={`mt-0.5 flex min-w-0 gap-1 text-[12.5px] ${pressed ? 'opacity-90' : C.muted}`}>
                            <span className="shrink-0 tabular-nums">{formatHours(d.hours)}</span>
                            {d.area && <span className="hidden min-w-0 truncate @xl:inline">· {d.area}</span>}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError id={id('stops-error')} message={errors.stops} />
                {/* Pesan "maksimal 5" hanya selama rute penuh (hilang begitu satu tempat dihapus) */}
                <p role="status" className={`mt-2 min-h-5 text-[13px] ${C.muted}`}>
                  {full ? notice : ''}
                </p>
              </div>

              <div className="grid gap-5 @xl:grid-cols-2">
                {m.pickups.length > 0 && (
                  <div className="min-w-0">
                    <label htmlFor={id('pickup')} className={`mb-1.5 block ${TYPE.field} ${C.ink}`}>
                      Jemput di
                    </label>
                    <div className="relative">
                      <select id={id('pickup')} value={pickup} onChange={(e) => setPickup(e.target.value)} className={`${INPUT} h-12 appearance-none pr-9`}>
                        {m.pickups.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
                    </div>
                  </div>
                )}
                <div className="min-w-0">
                  <label htmlFor={id('date')} className={`mb-1.5 block ${TYPE.field} ${C.ink}`}>
                    Tanggal tur
                  </label>
                  <input
                    ref={dateRef}
                    id={id('date')}
                    type="date"
                    min={today}
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      if (errors.date) setErrors((er) => ({ ...er, date: undefined }));
                    }}
                    aria-invalid={errors.date ? true : undefined}
                    aria-describedby={errors.date ? id('date-error') : undefined}
                    className={`${INPUT} h-12 ${errors.date ? 'ring-2 ring-[#B42318]' : ''}`}
                  />
                  <FieldError id={id('date-error')} message={errors.date} />
                </div>
              </div>

              {cars.length > 0 && (
                <fieldset className="min-w-0">
                  <legend className={`mb-2 ${TYPE.field} ${C.ink}`}>Mobil</legend>
                  {/* Nama kelas boleh dua baris (mis. "Minibus 14 kursi") — tidak pernah keluar dari pilnya; jumlah kursi
                      di dalam pil hanya mulai @xl (di HP sudah tertulis di baris bawah) */}
                  <div className={`grid gap-1 bg-[#F5EFE6] p-1.5 ${CAR_TRACK[Math.min(cars.length, 4)]}`}>
                    {cars.map((c, i) => (
                      <label
                        key={`${c.name}-${i}`}
                        className={`relative flex min-h-11 min-w-0 cursor-pointer flex-wrap items-center justify-center gap-x-1.5 rounded-full px-2.5 py-1.5 text-center text-[13.5px] font-semibold leading-tight text-balance [overflow-wrap:anywhere] transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--ps-ink) @xl:px-4 @xl:text-[14.5px] ${
                          i === carIndex ? 'bg-white text-[#1E2622] ring-1 ring-inset ring-[#1E2622]/15' : 'text-[#1E2622]/75 hover:text-[#1E2622]'
                        }`}
                      >
                        <input type="radio" name={id('car')} value={i} checked={i === carIndex} onChange={() => setCar(i)} className="sr-only" />
                        <span className="min-w-0">{c.name}</span>
                        {c.seats > 0 && (
                          <>
                            <span aria-hidden className={`hidden whitespace-nowrap font-normal tabular-nums @xl:inline ${C.muted}`}>
                              · {c.seats}
                            </span>
                            <span className="sr-only">, {c.seats} penumpang</span>
                          </>
                        )}
                      </label>
                    ))}
                  </div>
                  {selectedCar && (
                    <p className={`mt-2 text-[13px] ${C.muted}`}>
                      {[selectedCar.seats ? `${selectedCar.seats} penumpang` : '', selectedCar.luggage, 'atau setara'].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </fieldset>
              )}
            </div>
          </Reveal>
        </div>
        <Reveal delay={120} className="min-w-0 @5xl:col-span-6 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+96px)] @5xl:self-start @7xl:col-span-5">
          {result}
        </Reveal>
      </form>
    </TemplateSection>
  );
}
