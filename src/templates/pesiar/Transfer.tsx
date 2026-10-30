// Antar-jemput bandara (kunci `transfer`, pita PASIR). Dua kolom mulai 1280px (6/6; 7/5 mulai 1536px agar pilihan mobil
// "Minibus · 12 penumpang" tidak terpotong; lebih sempit: bertumpuk, formulir selebar
// penuh dengan isian dua kolom — di 1024px kolom kanan terlalu sempit). Kiri (1-7): kepala section, tabel harga per area × mobil (putih
// radius 22, kolom area menempel, menggulir di wadahnya bila sempit; HP < 672px: baris bertumpuk — nama mobil sekali di
// atas, tiap area nama + waktu tempuh lalu semua harga di bawahnya, tanpa geser) + catatan "harga contoh",
// lalu empat keterangan layanan berikon (papan nama, tunggu 60 menit, bantu koper, air mineral). Kanan (8-12): kartu
// putih radius 28 dengan foto 16:7 di atas dan formulir: arah (jemput di / antar ke bandara), tanggal, jam
// mendarat/terbang, nomor penerbangan (opsional, mis. "GA 404"), area, hotel/alamat, penumpang, mobil, perkiraan harga
// langsung → "Susun pesan WhatsApp" → pesan ditampilkan apa adanya + "Buka WhatsApp" / "Ubah data". JUJUR: hanya MENYUSUN
// pesan — tanpa pembayaran online, tanpa pelacakan penerbangan otomatis, harga contoh dikonfirmasi admin.
import { Check, ChevronDown, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { hasImage, text } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { focusField } from './hooks';
import {
  DIRECTIONS,
  TRANSFER_LIMITS,
  formatPriceShort,
  formatRupiah,
  maxSeats,
  messageMailHref,
  needsMoreCars,
  textItems,
  todayIso,
  transferMessage,
  transferPrice,
  validateTransfer,
  type PesiarModel,
  type TransferErrors,
  type TransferForm,
} from './model';
import { PESIAR_PHOTOS } from './photos';
import { BTN, C, FOCUS_SCROLL, GRID_GAP, INPUT, SECTION_PAD, TYPE, WRAP } from './styles';
import { AutoIcon, FieldError, SectionHead } from './ui';

type Key = keyof TransferErrors;

/** Baris tabel harga di HP (< 672px): kisi N kolom sama lebar (N = kelas mobil, --ps-fare-cols), tepi 16px. */
const FARE_ROW = '@max-2xl:grid @max-2xl:grid-cols-[repeat(var(--ps-fare-cols),minmax(0,1fr))] @max-2xl:gap-x-3 @max-2xl:px-4';

function Field({ id, label, error, hint, children, className = '' }: { id: string; label: string; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block ${TYPE.field} ${C.ink}`}>
        {label}
        {hint && <span className={`font-normal ${C.muted}`}> {hint}</span>}
      </label>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

function TransferPanel({ m }: { m: PesiarModel }) {
  const { transfer } = m;
  const baseId = useId();
  const [today] = useState(() => todayIso());
  const zones = m.zones;
  const cars = m.cars;
  const [form, setForm] = useState<TransferForm>({ direction: 'arrive', date: '', time: '', flight: '', zone: 0, hotel: '', pax: '2', car: Math.min(1, Math.max(0, cars.length - 1)) });
  const [errors, setErrors] = useState<TransferErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const title = text(transfer, 'form_title') || 'Pesan antar-jemput';
  const note = text(transfer, 'form_note') || 'Formulir hanya menyusun pesan WhatsApp. Tidak ada pembayaran online.';
  const id = (key: string) => `${baseId}-${key}`;
  const direction = DIRECTIONS.find((d) => d.key === form.direction) ?? DIRECTIONS[0];
  // Tanpa daftar mobil: harga mobil ke-1 = harga per mobil (sama dengan satu kolom di tabel)
  const price = transferPrice(zones[form.zone], cars.length ? form.car : 0);
  const paxCount = Number(form.pax);
  const groupHint = /^\d{1,2}$/.test(form.pax.trim()) && needsMoreCars(paxCount, cars) ? `Lebih dari ${maxSeats(cars)} penumpang: perlu lebih dari satu mobil, dikonfirmasi admin.` : '';
  const set = <K extends keyof TransferForm>(key: K, value: TransferForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    // Ganti mobil juga menghapus galat penumpang (galat lama menyebut mobil sebelumnya)
    const stale = key === 'car' ? 'pax' : key;
    if (stale in errors) setErrors((e) => ({ ...e, [stale]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ref: (el: HTMLInputElement | null) => {
      refs.current[key] = el;
    },
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateTransfer(form, cars, todayIso());
    setErrors(found);
    // Urutan isian di layar: tanggal, jam, penerbangan, penumpang, (area, mobil,) hotel
    const first = (['date', 'time', 'flight', 'pax', 'hotel'] as Key[]).find((key) => found[key]);
    if (first) {
      focusField(refs.current[first]);
      return;
    }
    setCopied(false);
    setSent(transferMessage(form, zones, cars, m.companyName));
    window.setTimeout(() => focusField(resultHeading.current), 0);
  };

  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  if (sent) {
    const wa = m.waWith(sent);
    const mail = !wa ? messageMailHref(text(m.contact, 'email'), 'Antar-jemput bandara', sent) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className="overflow-hidden rounded-[28px] bg-white ring-1 ring-inset ring-black/[0.07]" aria-live="polite">
        <div className="p-5 @3xl:p-8">
          <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 ${TYPE.h3} ${C.ink} ${FOCUS_SCROLL} focus:outline-none`}>
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </span>
            Pesan siap dikirim
          </h3>
          <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya, lalu kirim. Pesan belum terkirim sebelum Anda menekan kirim.</p>
          <pre className={`mt-5 max-h-[380px] overflow-auto whitespace-pre-wrap rounded-[16px] bg-[#F5EFE6] p-4 font-sans text-[14px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
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
                window.setTimeout(() => focusField(refs.current.date), 0);
              }}
              className="inline-flex min-h-11 items-center justify-center gap-2 text-[15px] font-medium text-[#1E2622] underline decoration-[#1E2622]/35 underline-offset-[6px]"
            >
              <PencilLine aria-hidden className="h-4 w-4" />
              Ubah data
            </button>
          </div>
          {privacy}
        </div>
      </div>
    );
  }

  const select = (key: 'zone' | 'car', options: string[]) => (
    <div className="relative">
      <select id={id(key)} value={form[key]} onChange={(e) => set(key, Number(e.target.value))} className={`${INPUT} h-12 appearance-none pr-9`}>
        {options.map((option, i) => (
          <option key={`${option}-${i}`} value={i}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
    </div>
  );

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={id('title')} className="overflow-hidden rounded-[28px] bg-white ring-1 ring-inset ring-black/[0.07]">
      <div className="p-5 @3xl:p-8">
        <h3 id={id('title')} className={`${TYPE.h3} ${C.ink}`}>
          {title}
        </h3>
        <fieldset className="mt-5 min-w-0">
          <legend className="sr-only">Layanan</legend>
          <div className="grid grid-cols-2 gap-1.5 rounded-full bg-[#F5EFE6] p-1.5">
            {DIRECTIONS.map((d) => (
              <label
                key={d.key}
                className={`relative flex min-h-11 cursor-pointer items-center justify-center rounded-full px-2 py-1 text-center text-[13px] font-semibold leading-tight text-balance transition-colors @xl:px-3 @xl:text-[14px] duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--ps-ink) ${
                  form.direction === d.key ? 'bg-white text-[#1E2622] ring-1 ring-inset ring-[#1E2622]/15' : 'text-[#1E2622]/75 hover:text-[#1E2622]'
                }`}
              >
                <input type="radio" name={id('direction')} value={d.key} checked={form.direction === d.key} onChange={() => set('direction', d.key)} className="sr-only" />
                {d.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 grid gap-4 @xl:grid-cols-2">
          <Field id={id('date')} label="Tanggal" error={errors.date}>
            <input type="date" {...bind('date')} min={today} value={form.date} onChange={(e) => set('date', e.target.value)} className={`${INPUT} h-12 ${ring('date')}`} />
          </Field>
          <Field id={id('time')} label={direction.time} error={errors.time}>
            <input type="time" {...bind('time')} value={form.time} onChange={(e) => set('time', e.target.value)} className={`${INPUT} h-12 ${ring('time')}`} />
          </Field>
          <Field id={id('flight')} label="Nomor penerbangan" hint="(opsional)" error={errors.flight}>
            <input
              type="text"
              {...bind('flight')}
              value={form.flight}
              maxLength={TRANSFER_LIMITS.flight}
              placeholder="mis. GA 404"
              autoComplete="off"
              onChange={(e) => set('flight', e.target.value)}
              className={`${INPUT} h-12 uppercase placeholder:normal-case ${ring('flight')}`}
            />
          </Field>
          <Field id={id('pax')} label="Penumpang" error={errors.pax}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              {...bind('pax')}
              {...(groupHint && !errors.pax ? { 'aria-describedby': id('pax-hint') } : {})}
              value={form.pax}
              onChange={(e) => set('pax', e.target.value.slice(0, TRANSFER_LIMITS.pax))}
              className={`${INPUT} h-12 tabular-nums ${ring('pax')}`}
            />
            {/* Rombongan lebih besar dari mobil terbesar: tetap bisa dipesan (bukan galat) */}
            {groupHint && !errors.pax && (
              <p id={id('pax-hint')} className={`mt-1.5 text-[13px] leading-snug ${C.muted}`}>
                {groupHint}
              </p>
            )}
          </Field>
          {zones.length > 0 && (
            <Field id={id('zone')} label="Area">
              {select(
                'zone',
                zones.map((z) => z.name),
              )}
            </Field>
          )}
          {cars.length > 0 && (
            <Field id={id('car')} label="Mobil">
              {select(
                'car',
                cars.map((c) => (c.seats ? `${c.name} · ${c.seats} penumpang` : c.name)),
              )}
            </Field>
          )}
          <Field id={id('hotel')} label={form.direction === 'arrive' ? 'Hotel / alamat tujuan' : 'Hotel / alamat jemput'} error={errors.hotel} className="@xl:col-span-2">
            <input
              type="text"
              {...bind('hotel')}
              value={form.hotel}
              maxLength={TRANSFER_LIMITS.hotel}
              autoComplete="off"
              onChange={(e) => set('hotel', e.target.value)}
              className={`${INPUT} h-12 ${ring('hotel')}`}
            />
          </Field>
        </div>
        {price > 0 && (
          <p className={`mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-4 ${C.line}`}>
            <span className={`text-[13.5px] ${C.muted}`}>Perkiraan harga per mobil</span>
            <span className={`text-[22px] font-semibold tabular-nums ${C.ink}`}>{formatRupiah(price)}</span>
          </p>
        )}
        <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-5 w-full`}>
          {m.whatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
          {text(transfer, 'form_button') || 'Susun pesan WhatsApp'}
        </button>
        {privacy}
      </div>
    </form>
  );
}

export function Transfer({ m }: { m: PesiarModel }) {
  const { transfer } = m;
  const zones = m.zones;
  const notes = textItems(transfer, 'notes', 4);
  // Kolom mobil hanya untuk mobil yang punya harga di salah satu area. Tanpa daftar mobil (usaha antar-jemput saja):
  // satu kolom "Harga per mobil" dari harga mobil ke-1, sama dengan perkiraan di formulir.
  const columns: { index: number; name: string; seats: number }[] = m.cars.length
    ? m.cars.filter((c) => zones.some((z) => z.prices[c.index] > 0))
    : zones.some((z) => z.prices[0] > 0)
      ? [{ index: 0, name: 'Harga per mobil', seats: 0 }]
      : [];
  const image = text(transfer, 'image');
  return (
    <TemplateSection sectionKey="transfer" className={`${SECTION_PAD} ${C.sand}`}>
      <div className={WRAP}>
        <SectionHead number={m.number('transfer')} eyebrow={text(transfer, 'eyebrow')} title={text(transfer, 'title')} subtitle={text(transfer, 'subtitle')} srTitle="Antar-jemput bandara" />
        <div className={`mt-10 grid grid-cols-1 gap-y-10 @3xl:mt-14 @7xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @7xl:col-span-6 @min-[96rem]:col-span-7">
            {hasImage(image) && (
              <Reveal className="relative mb-8">
                <KitPhoto
                  src={image}
                  alt={PESIAR_PHOTOS.alt(image, 'Tamu tiba di bandara membawa koper')}
                  sizes="(min-width: 1280px) 56vw, 100vw"
                  fallback="none"
                  className="aspect-[16/7] rounded-[28px]"
                />
                {/* Garis 1px ke dalam DI ATAS foto: tepi foto yang terang tetap terlihat di pita pasir */}
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-black/[0.08]" />
              </Reveal>
            )}
            <Reveal>
              {/* ≥ 672px: tabel biasa (kolom area menempel; menggulir di wadahnya bila sempit). HP (< 672px): baris
                  BERTUMPUK agar SEMUA kelas mobil terlihat tanpa geser — judul kolom = nama mobil sekali di atas, tiap
                  area satu baris nama + waktu tempuh, harga di kolom yang sama di bawahnya. Peran tabel ditulis eksplisit
                  karena display tabel diganti grid di HP (semantik tetap terbaca pembaca layar). */}
              <div role="region" aria-label="Tabel harga antar-jemput bandara" tabIndex={0} className="overflow-x-auto rounded-[22px] bg-white ring-1 ring-black/[0.07] focus-visible:outline-2 focus-visible:outline-(--ps-ink)">
                <table role="table" style={{ '--ps-fare-cols': String(Math.max(1, columns.length)) } as CSSProperties} className="w-full border-collapse text-left @max-2xl:block @2xl:min-w-[460px]">
                  <caption className="sr-only">Harga contoh antar-jemput bandara per mobil, sekali jalan</caption>
                  <thead role="rowgroup" className="@max-2xl:block">
                    <tr role="row" className={`border-b text-[12.5px] ${C.line} ${C.muted} ${FARE_ROW} @max-2xl:py-3`}>
                      <th role="columnheader" scope="col" className="sticky left-0 z-[1] min-w-[156px] bg-white py-4 pl-4 pr-3 font-medium @max-2xl:hidden @2xl:pl-5 @2xl:pr-4">
                        Area · waktu tempuh
                      </th>
                      {columns.map((c) => (
                        <th key={c.index} role="columnheader" scope="col" className="whitespace-nowrap px-3 py-4 text-right font-medium @max-2xl:min-w-0 @max-2xl:truncate @max-2xl:p-0 @max-2xl:text-left @2xl:px-4">
                          {c.name}
                          {c.seats > 0 && <span className="block text-[12px] font-normal tabular-nums @max-2xl:sr-only">{c.seats} penumpang</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className={`divide-y ${C.divide} @max-2xl:block`}>
                    {zones.map((z, i) => (
                      <tr key={`${z.name}-${i}`} role="row" className={`transition-colors hover:bg-[#F5EFE6]/60 ${FARE_ROW} @max-2xl:gap-y-1.5 @max-2xl:py-3.5`}>
                        <th
                          role="rowheader"
                          scope="row"
                          className={`sticky left-0 z-[1] min-w-[156px] bg-white py-3.5 pl-4 pr-3 text-left font-normal @max-2xl:static @max-2xl:col-span-full @max-2xl:flex @max-2xl:min-w-0 @max-2xl:items-baseline @max-2xl:justify-between @max-2xl:gap-3 @max-2xl:bg-transparent @max-2xl:p-0 @2xl:pl-5 @2xl:pr-4 ${C.ink}`}
                        >
                          <span className="block min-w-0 text-[15.5px] font-semibold leading-snug">{z.name}</span>
                          {z.time && <span className={`mt-0.5 block shrink-0 text-[13px] tabular-nums @max-2xl:mt-0 ${C.muted}`}>{z.time}</span>}
                        </th>
                        {columns.map((c) => (
                          <td key={c.index} role="cell" className={`whitespace-nowrap px-3 py-3.5 text-right text-[15.5px] font-semibold tabular-nums @max-2xl:p-0 @max-2xl:text-left @max-2xl:text-[15px] @2xl:px-4 ${C.ink}`}>
                            {formatPriceShort(z.prices[c.index]) || <span className={C.muted}>–</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={`mt-3 ${TYPE.small} ${C.muted}`}>Harga contoh per mobil, sekali jalan; dikonfirmasi admin lewat WhatsApp.</p>
            </Reveal>
          </div>
          {/* Kanan (≥ 1280px; lebih sempit: di bawah foto & tabel, selebar penuh): formulir + keterangan layanan */}
          <div className="min-w-0 @7xl:col-span-6 @min-[96rem]:col-span-5">
            <Reveal delay={120}>
              <TransferPanel m={m} />
            </Reveal>
            {notes.length > 0 && (
              <ul aria-label="Keterangan layanan" className="mt-4 grid gap-2.5 @xl:grid-cols-2">
                {notes.map((n, i) => (
                  <Reveal as="li" key={`${n}-${i}`} delay={stagger(i, 60)} className={`flex min-h-14 items-center gap-3 rounded-[18px] bg-white/70 px-3.5 py-2.5 ring-1 ring-inset ring-black/[0.06] ${C.ink}`}>
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#17332B] text-[#F5EFE6]">
                      <AutoIcon label={n} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="text-[14px] font-medium leading-snug">{n}</span>
                  </Reveal>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
