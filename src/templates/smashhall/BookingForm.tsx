// Formulir booking & pendaftaran SmashHall (di dalam section `contact`): keperluan, nama, tanggal (wajib untuk booking
// lapangan), jam (dari tabel ketersediaan), jumlah pemain, dan catatan. JUJUR: formulir hanya MENYUSUN pesan — tidak
// ada fetch, localStorage, atau <form action>; data tidak disimpan di website. Setelah lolos validasi, pesan tampil apa
// adanya dengan tombol "Buka WhatsApp" (tanpa nomor WhatsApp: "Kirim lewat email"; tanpa keduanya: "Salin pesan").
import { Check, ChevronDown, CircleAlert, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { text, whatsappHref } from '../shared/utils';
import {
  BOOKING_LIMITS,
  EMPTY_BOOKING,
  PLAYERS,
  PURPOSES,
  REQUIRED_BOOKING,
  UNKNOWN_TIME,
  bookingFormMessage,
  bookingMailHref,
  validateBooking,
  type BookingErrors,
  type BookingForm as Form,
  type SmashModel,
} from './model';
import { BTN, C, INPUT, TYPE_S } from './styles';

type Key = keyof Form;

function Field({ id, label, error, optional = false, className = '', children }: { id: string; label: string; error?: string; optional?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-medium ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (opsional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function BookingForm({ m }: { m: SmashModel }) {
  const { contact } = m;
  const baseId = useId();
  const [form, setForm] = useState<Form>(EMPTY_BOOKING);
  const [errors, setErrors] = useState<BookingErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const title = text(contact, 'form_title');
  // Kalimat jujur selalu tampil: isian CMS, atau kalimat bawaan bila dikosongkan
  const note = text(contact, 'form_text') || 'Formulir ini hanya menyusun pesan WhatsApp untuk admin; data tidak disimpan di website.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(contact, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const booking = form.purpose === 'Booking lapangan';
  const times = [UNKNOWN_TIME, ...m.hours];
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ref: (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null) => {
      refs.current[key] = el;
    },
    value: form[key],
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateBooking(form);
    setErrors(found);
    const first = REQUIRED_BOOKING.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setCopied(false);
    setSent(bookingFormMessage(form, text(m.brand, 'company_name')));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = 'rounded-[20px] bg-white p-5 ring-1 ring-inset ring-[#171512]/[0.08] @3xl:p-7 @5xl:p-8';
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? bookingMailHref(text(contact, 'email'), sent) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className={panel} aria-live="polite">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${TYPE_S.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya, lalu kirim ke admin. Pesan belum terkirim sebelum Anda menekan kirim.</p>
        <pre className={`mt-5 max-h-[380px] overflow-auto whitespace-pre-wrap rounded-xl p-4 font-sans text-[14px] leading-relaxed ${C.sand} ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
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
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`${BTN.ghost} ${BTN.lg}`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
        {privacy}
      </div>
    );
  }

  const select = (key: 'purpose' | 'time', options: readonly string[], placeholder?: string) => (
    <div className="relative">
      <select {...bind(key)} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} h-12 appearance-none pr-10 ${ring(key)}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
    </div>
  );
  const pairs = 'grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2';

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={title ? `${baseId}-title` : undefined}
      aria-label={title ? undefined : 'Formulir booking & pendaftaran'}
      className={panel}
    >
      {title && (
        <h3 id={`${baseId}-title`} className={`${TYPE_S.h3} ${C.ink}`}>
          {title}
        </h3>
      )}
      <div className={`grid gap-4 ${title ? 'mt-6' : ''}`}>
        <div className={pairs}>
          <Field id={id('purpose')} label="Keperluan" error={errors.purpose}>
            {select('purpose', PURPOSES, 'Pilih keperluan')}
          </Field>
          <Field id={id('name')} label="Nama" error={errors.name}>
            <input type="text" {...bind('name')} maxLength={BOOKING_LIMITS.name} autoComplete="name" onChange={(e) => set('name')(e.target.value)} className={`${INPUT} h-12 ${ring('name')}`} />
          </Field>
        </div>
        <div className={pairs}>
          <Field id={id('date')} label="Tanggal" optional={!booking} error={errors.date}>
            <input type="date" {...bind('date')} onChange={(e) => set('date')(e.target.value)} className={`${INPUT} h-12 ${ring('date')}`} />
          </Field>
          <Field id={id('time')} label="Jam" optional>
            {select('time', times)}
          </Field>
        </div>
        <fieldset className="min-w-0">
          <legend className={`mb-1.5 text-[14px] font-medium ${C.ink}`}>
            Jumlah pemain <span className={`font-normal ${C.muted}`}>(opsional)</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {PLAYERS.map((p) => (
              <label
                key={p}
                className={`relative flex h-11 cursor-pointer items-center justify-center rounded-xl bg-white px-2 text-center text-[14px] font-medium ring-1 ring-inset ring-[#171512]/45 transition-colors has-[:checked]:bg-[#171512] has-[:checked]:text-white has-[:checked]:ring-[#171512] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) ${C.ink}`}
              >
                <input type="radio" name={`${baseId}-players`} value={p} checked={form.players === p} onChange={() => set('players')(p)} className="sr-only" />
                {p}
              </label>
            ))}
          </div>
        </fieldset>
        <Field id={id('note')} label="Catatan" optional>
          <textarea {...bind('note')} maxLength={BOOKING_LIMITS.note} rows={3} onChange={(e) => set('note')(e.target.value)} className={`${INPUT} min-h-24 py-3`} />
        </Field>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-7 w-full`}>
        {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
        {button}
      </button>
      {privacy}
    </form>
  );
}
