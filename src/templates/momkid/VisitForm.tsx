// Formulir pendaftaran kunjungan MomKid (di dalam section `contact`). Menanyakan nama, layanan, usia kehamilan / umur
// anak, tanggal kunjungan, waktu (pagi/siang/sore), dan cara bayar (umum / BPJS Kesehatan / asuransi), plus catatan.
// JUJUR: formulir hanya MENYUSUN pesan — tidak ada fetch, localStorage, atau <form action>; data tidak disimpan di
// website, tidak ada rekam medis atau pembayaran. Setelah lolos validasi, pesan ditampilkan apa adanya dengan tombol
// "Buka WhatsApp" (tanpa nomor WhatsApp: "Kirim lewat email"; tanpa keduanya: "Salin pesan"). Pratinjau: tautan tidak
// dibuka (ActionLink). Catatan darurat selalu tampil: kondisi darurat → IGD atau 119, bukan formulir.
import { Check, ChevronDown, CircleAlert, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { text, whatsappHref } from '../shared/utils';
import {
  EMPTY_VISIT,
  PAYMENTS,
  REQUIRED_FIELDS,
  TIMES,
  VISIT_LIMITS,
  validateVisit,
  visitMailHref,
  visitMessage,
  visitServices,
  type MomkidModel,
  type VisitErrors,
  type VisitForm as VisitData,
} from './model';
import { BG, BTN, C, DISPLAY, INPUT, TEXT_LINK, TYPE } from './styles';

type Key = keyof VisitData;

/** Kalimat bawaan bila keterangan formulir di CMS kosong (selalu ada kalimat jujur). */
const DEFAULT_NOTE = 'Formulir ini hanya menyusun pesan WhatsApp; data tidak disimpan di website.';
const EMERGENCY_NOTE = 'Untuk kondisi darurat, jangan memakai formulir ini: segera ke IGD atau telepon 119.';

function Field({ id, label, error, optional = false, className = '', children }: { id: string; label: string; error?: string; optional?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-semibold ${C.ink}`}>
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

/** Pilihan pil (radio) — waktu kunjungan & cara bayar. */
function Pills({ name, legend, options, value, onChange }: { name: string; legend: string; options: readonly string[]; value: string; onChange: (v: string) => void }) {
  return (
    <fieldset className="min-w-0">
      <legend className={`mb-1.5 text-[14px] font-semibold ${C.ink}`}>
        {legend} <span className={`font-normal ${C.muted}`}>(opsional)</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option}
            className={`relative flex h-11 cursor-pointer items-center justify-center rounded-full bg-white px-4 text-center ${DISPLAY} text-[14.5px] font-extrabold ring-1 ring-inset ring-[#2E2228]/45 transition-colors has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--mk-accent-text) ${C.ink}`}
          >
            <input type="radio" name={name} value={option} checked={value === option} onChange={() => onChange(option)} className="sr-only" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function VisitForm({ m }: { m: MomkidModel }) {
  const { contact } = m;
  const baseId = useId();
  const services = visitServices(contact);
  const [form, setForm] = useState<VisitData>(EMPTY_VISIT);
  const [errors, setErrors] = useState<VisitErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const title = text(contact, 'form_title');
  const note = text(contact, 'form_text') || DEFAULT_NOTE;
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(contact, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
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
    maxLength: VISIT_LIMITS[key],
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateVisit(form, services);
    setErrors(found);
    const first = REQUIRED_FIELDS.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setCopied(false);
    setSent(visitMessage(form, text(m.brand, 'company_name')));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = `rounded-[28px] p-5 @3xl:p-7 @5xl:p-8 ${BG.peachSoft}`;
  const privacy = (
    <div className={`mt-5 grid gap-2 text-[13px] leading-snug ${C.muted}`}>
      <p className="flex items-start gap-2">
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {note}
      </p>
      <p className="flex items-start gap-2">
        <CircleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {EMERGENCY_NOTE}
      </p>
    </div>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? visitMailHref(text(contact, 'email'), sent) : '';
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
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${TYPE.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya, lalu kirim ke admin kami. Pesan belum terkirim sebelum Anda menekan kirim.</p>
        <pre className={`mt-5 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl bg-white p-4 font-sans text-[14px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>
          {sent}
        </pre>
        <div className="mt-6 flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center @xl:gap-6">
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
            className={`${TEXT_LINK} self-center`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
        {privacy}
      </div>
    );
  }

  const input = (key: Key, extra: { placeholder?: string; autoComplete?: string; type?: string } = {}) => (
    <input type="text" {...bind(key)} {...extra} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} h-12 ${ring(key)}`} />
  );
  const pairs = 'grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2';

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={title ? `${baseId}-title` : undefined}
      aria-label={title ? undefined : 'Formulir pendaftaran kunjungan'}
      className={panel}
    >
      {title && (
        <h3 id={`${baseId}-title`} className={`flex items-center gap-2.5 ${TYPE.h3} ${C.ink}`}>
          {title}
        </h3>
      )}
      <div className={`grid gap-4 ${title ? 'mt-6' : ''}`}>
        <div className={pairs}>
          <Field id={id('name')} label="Nama" error={errors.name}>
            {input('name', { autoComplete: 'name' })}
          </Field>
          <Field id={id('service')} label="Layanan" error={errors.service}>
            <div className="relative">
              <select {...bind('service')} onChange={(e) => set('service')(e.target.value)} className={`${INPUT} h-12 appearance-none pr-10 ${ring('service')}`}>
                <option value="">Pilih layanan</option>
                {services.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
            </div>
          </Field>
        </div>
        <div className={pairs}>
          <Field id={id('detail')} label="Usia kehamilan / umur anak" optional>
            {input('detail', { placeholder: 'mis. 32 minggu atau 4 bulan' })}
          </Field>
          <Field id={id('date')} label="Tanggal kunjungan" error={errors.date} optional>
            {input('date', { type: 'date' })}
          </Field>
        </div>
        <Pills name={`${baseId}-time`} legend="Waktu" options={TIMES} value={form.time} onChange={set('time')} />
        <Pills name={`${baseId}-payment`} legend="Pembayaran" options={PAYMENTS} value={form.payment} onChange={set('payment')} />
        <Field id={id('note')} label="Catatan" optional>
          <textarea {...bind('note')} rows={3} onChange={(e) => set('note')(e.target.value)} className={`${INPUT} min-h-24 py-3`} placeholder="mis. kontrol pertama, ingin dokter perempuan" />
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
