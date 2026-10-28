// Bilah "Booking cepat" di dasar hero Sparring Padel: panel kaca biru-malam (radius 18, cincin putih 12%) berisi
// Tanggal, Lapangan (Indoor/Outdoor), Jam mulai (per jam dari jam buka di CMS), Pemain (2/4), dan tombol neon besar
// "Book Now". JUJUR: hanya MENYUSUN pesan WhatsApp — tidak ada fetch, localStorage, atau <form action>; ketersediaan
// tidak dicek di website (admin mengonfirmasi), tidak ada pembayaran. Setelah lolos validasi, panel menampilkan
// ringkasan + "Buka WhatsApp" (tanpa nomor: email, tanpa keduanya: salin pesan) + "Ubah". Hero hanya punya H1, jadi
// judul hasil berupa <p> yang bisa difokus. Layar lebar: satu baris; @3xl: 2×2 + tombol; HP: 2 kolom, tombol penuh.
import { CalendarDays, Check, ChevronDown, CircleAlert, Copy, Info, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { text, whatsappHref } from '../shared/utils';
import {
  BOOKING_REQUIRED,
  COURT_CHOICES,
  EMPTY_BOOKING,
  PLAYER_CHOICES,
  bookingMessage,
  bookingSummary,
  hourSlots,
  mailWith,
  todayIso,
  validateBooking,
  type BookingErrors,
  type BookingForm,
  type SparringModel,
} from './model';
import { BTN, ERROR, INPUT_DARK, MONO_LABEL } from './styles';
import { ArrowDot } from './ui';

type Key = keyof BookingForm;

const LABEL = `mb-2 block ${MONO_LABEL} text-[11px] text-white/72`;

function Segmented({ name, legend, options, value, onChange, suffix = '' }: { name: string; legend: string; options: readonly string[]; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className={LABEL}>{legend}</legend>
      <div className="grid h-12 grid-flow-col auto-cols-fr gap-1 rounded-[12px] bg-white/[0.07] p-1 ring-1 ring-inset ring-white/25">
        {options.map((option) => (
          <label
            key={option}
            className="relative flex cursor-pointer items-center justify-center rounded-[9px] px-2 text-[14px] font-semibold text-white/85 transition-colors has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--sp-neon)"
          >
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            {option}
            {suffix}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {children}
      {/* Satu baris (layar lebar): galat melayang di bawah isian agar isian lain & tombol tetap sejajar */}
      {error && (
        <p id={`${id}-error`} className={`mt-1.5 flex items-start gap-1.5 text-[13px] font-medium @6xl:absolute @6xl:inset-x-0 @6xl:top-full ${ERROR.dark}`}>
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function BookingBar({ m }: { m: SparringModel }) {
  const { hero, contact } = m;
  const baseId = useId();
  const slots = hourSlots(text(hero, 'booking_hours'));
  const [form, setForm] = useState<BookingForm>(EMPTY_BOOKING);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [sent, setSent] = useState<{ message: string; summary: string[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | HTMLSelectElement | null>>>({});
  const resultRef = useRef<HTMLParagraphElement>(null);

  const titleText = text(hero, 'booking_title');
  const button = text(hero, 'booking_button') || 'Book Now';
  const note = text(hero, 'booking_note') || 'Admin mengonfirmasi ketersediaan lewat WhatsApp. Tanpa pembayaran online.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const describe = (key: Key) => (errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {});
  const ring = (key: Key) => (errors[key] ? ERROR.ringDark : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateBooking(form, slots, todayIso());
    setErrors(found);
    const first = BOOKING_REQUIRED.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setCopied(false);
    setSent({ message: bookingMessage(form, m.companyName), summary: bookingSummary(form) });
    window.setTimeout(() => resultRef.current?.focus(), 0);
  };

  const panel = 'rounded-[18px] bg-[color-mix(in_srgb,var(--sp-night)_86%,transparent)] p-4 ring-1 ring-inset ring-white/12 backdrop-blur-md @3xl:p-5 @6xl:p-6';
  const hasErrors = !!(errors.date || errors.time);
  const noteLine = (
    <p className={`mt-3 flex items-start gap-2 text-[13px] leading-snug text-white/72 ${hasErrors && !sent ? '@6xl:mt-9' : ''}`}>
      <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-(--sp-neon)" />
      {note}
    </p>
  );
  const heading = titleText && (
    <p className={`mb-3 flex items-center gap-2 ${MONO_LABEL} text-white`}>
      <CalendarDays aria-hidden className="h-4 w-4 text-(--sp-neon)" />
      {titleText}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent.message) : null;
    const mail = !wa ? mailWith(text(contact, 'email'), 'Booking lapangan padel', sent.message) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent.message);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div data-sp-booking="sent" className={panel} aria-live="polite">
        <div className="flex flex-col gap-4 @5xl:flex-row @5xl:items-center @5xl:justify-between">
          <div className="min-w-0">
            <p ref={resultRef} tabIndex={-1} className="flex items-center gap-2.5 text-[17px] font-semibold text-white focus:outline-none">
              <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                <Check className="h-4 w-4" strokeWidth={2.5} />
              </span>
              Pesan booking siap
            </p>
            <ul aria-label="Ringkasan booking" className="mt-3 flex flex-wrap gap-2">
              {sent.summary.map((item) => (
                <li key={item} className="rounded-full bg-white/[0.08] px-3 py-1.5 text-[13px] font-medium text-white ring-1 ring-inset ring-white/15">
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] leading-snug text-white/72">Pesan belum terkirim sebelum Anda menekan kirim di WhatsApp.</p>
          </div>
          <div className="flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center @5xl:shrink-0">
            {wa ? (
              <ActionLink action={wa} className={`${BTN.neon} ${BTN.md}`}>
                <WhatsAppIcon className="h-5 w-5 shrink-0" />
                Buka WhatsApp
              </ActionLink>
            ) : mail ? (
              <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.neon} ${BTN.md}`}>
                Kirim lewat email
              </ActionLink>
            ) : (
              <button type="button" onClick={copy} className={`${BTN.neon} ${BTN.md}`}>
                {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
                {copied ? 'Tersalin' : 'Salin pesan'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setSent(null);
                window.setTimeout(() => refs.current.date?.focus(), 0);
              }}
              className={`${BTN.ghost} ${BTN.md}`}
            >
              <PencilLine aria-hidden className="h-4 w-4" />
              Ubah
            </button>
          </div>
        </div>
        {noteLine}
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label={titleText || 'Booking cepat'}
      data-sp-booking="form"
      className={panel}
    >
      {heading}
      <div className="grid grid-cols-2 gap-x-3 gap-y-4 @3xl:gap-x-4 @6xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,0.85fr)_auto] @6xl:items-end">
        <Field id={id('date')} label="Tanggal" error={errors.date}>
          <input
            type="date"
            id={id('date')}
            data-sp-booking-first=""
            ref={(el) => {
              refs.current.date = el;
            }}
            min={todayIso()}
            value={form.date}
            onChange={(e) => set('date')(e.target.value)}
            {...describe('date')}
            className={`${INPUT_DARK} h-12 ${ring('date')}`}
          />
        </Field>
        <Segmented name={`${baseId}-court`} legend="Lapangan" options={COURT_CHOICES} value={form.court} onChange={set('court')} />
        <Field id={id('time')} label="Jam mulai" error={errors.time}>
          <div className="relative">
          <select
            id={id('time')}
            ref={(el) => {
              refs.current.time = el;
            }}
            value={form.time}
            onChange={(e) => set('time')(e.target.value)}
            {...describe('time')}
            className={`${INPUT_DARK} h-12 appearance-none pr-10 ${ring('time')}`}
          >
            <option value="">Pilih jam</option>
            {slots.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/72" />
          </div>
        </Field>
        <Segmented name={`${baseId}-players`} legend="Pemain" options={PLAYER_CHOICES} value={form.players} onChange={set('players')} />
        <button type="submit" className={`${BTN.neon} ${BTN.xl} col-span-2 w-full justify-between @6xl:col-span-1 @6xl:w-auto`}>
          <span className="truncate">{button}</span>
          <ArrowDot />
        </button>
      </div>
      {noteLine}
    </form>
  );
}
