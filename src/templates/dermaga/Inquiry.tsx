// Formulir permintaan penawaran Dermaga (di dalam section `contact`). Menanyakan nama, perusahaan, jenis layanan,
// komoditas/produk, volume, muatan (FCL/LCL), Incoterm, negara tujuan (atau negara ASAL untuk layanan impor),
// pelabuhan, perkiraan jadwal, dan catatan. JUJUR: formulir hanya MENYUSUN pesan — tidak ada fetch, localStorage, atau
// <form action>; data tidak disimpan di website. Setelah lolos validasi, pesan ditampilkan apa adanya dengan tombol
// "Buka WhatsApp" (tanpa nomor WhatsApp: "Kirim lewat email"; tanpa keduanya: "Salin pesan"). Pratinjau: tautan tidak
// dibuka (ActionLink).
import { Check, ChevronDown, CircleAlert, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { text, whatsappHref } from '../shared/utils';
import {
  EMPTY_INQUIRY,
  INCOTERMS,
  INQUIRY_LIMITS,
  LOADS,
  REQUIRED_FIELDS,
  inquiryMailHref,
  inquiryMessage,
  inquiryServices,
  isImport,
  validateInquiry,
  type DermagaModel,
  type InquiryErrors,
  type InquiryForm,
} from './model';
import { BTN, C, INPUT, TEXT_LINK, TYPE_D } from './styles';

type Key = keyof InquiryForm;

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

export function Inquiry({ m }: { m: DermagaModel }) {
  const { contact } = m;
  const baseId = useId();
  const services = inquiryServices(contact);
  const [form, setForm] = useState<InquiryForm>(EMPTY_INQUIRY);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const title = text(contact, 'form_title');
  // Kalimat jujur selalu tampil: isian CMS, atau kalimat bawaan bila dikosongkan
  const note = text(contact, 'form_text') || 'Formulir ini hanya menyusun pesan untuk tim kami; data tidak disimpan di website.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(contact, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const importing = isImport(form.service);
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
    maxLength: INQUIRY_LIMITS[key],
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateInquiry(form, services);
    setErrors(found);
    const first = REQUIRED_FIELDS.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setCopied(false);
    setSent(inquiryMessage(form, text(m.brand, 'company_name')));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = `rounded-[4px] p-5 @3xl:p-7 @5xl:p-8 ${C.paper}`;
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? inquiryMailHref(text(contact, 'email'), sent) : '';
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
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${TYPE_D.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[2px] bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya, lalu kirim ke tim kami. Pesan belum terkirim sebelum Anda menekan kirim.</p>
        <pre className={`mt-5 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-[2px] border bg-white p-4 font-mono text-[13px] leading-relaxed ${C.line} ${C.ink} [overflow-wrap:anywhere]`}>
          {sent}
        </pre>
        <div className="mt-6 flex flex-col items-stretch gap-1 @xl:flex-row @xl:items-center @xl:gap-6">
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

  const select = (key: 'service' | 'incoterm', options: readonly string[], placeholder?: string) => (
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
  const input = (key: Key, extra: { placeholder?: string; autoComplete?: string } = {}) => (
    <input type="text" {...bind(key)} {...extra} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} h-12 ${ring(key)}`} />
  );
  const pairs = 'grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2';

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={title ? `${baseId}-title` : undefined}
      aria-label={title ? undefined : 'Formulir permintaan penawaran'}
      className={panel}
    >
      {title && (
        <h3 id={`${baseId}-title`} className={`${TYPE_D.h3} ${C.ink}`}>
          {title}
        </h3>
      )}
      <div className={`grid gap-4 ${title ? 'mt-6' : ''}`}>
        <div className={pairs}>
          <Field id={id('name')} label="Nama" error={errors.name}>
            {input('name', { autoComplete: 'name' })}
          </Field>
          <Field id={id('company')} label="Perusahaan" optional>
            {input('company', { autoComplete: 'organization' })}
          </Field>
        </div>
        <div className={pairs}>
          <Field id={id('service')} label="Jenis layanan" error={errors.service}>
            {select('service', services, 'Pilih layanan')}
          </Field>
          <Field id={id('product')} label="Komoditas / produk" error={errors.product}>
            {input('product', { placeholder: 'mis. furnitur kayu jati' })}
          </Field>
        </div>
        <div className={pairs}>
          <Field id={id('volume')} label="Volume" error={errors.volume}>
            {input('volume', { placeholder: 'mis. 2 × 40 kaki atau 12 CBM' })}
          </Field>
          <Field id={id('incoterm')} label="Incoterm" optional>
            {select('incoterm', INCOTERMS)}
          </Field>
        </div>
        <fieldset className="min-w-0">
          <legend className={`mb-1.5 text-[14px] font-medium ${C.ink}`}>
            Muatan <span className={`font-normal ${C.muted}`}>(opsional)</span>
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {LOADS.map((load) => (
              <label
                key={load}
                className={`relative flex h-11 cursor-pointer items-center justify-center rounded-[2px] bg-white px-2 text-center font-mono text-[13px] font-medium ring-1 ring-inset ring-[#0F1D20]/50 transition-colors has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) ${C.ink}`}
              >
                <input type="radio" name={`${baseId}-load`} value={load} checked={form.load === load} onChange={() => set('load')(load)} className="sr-only" />
                {load}
              </label>
            ))}
          </div>
        </fieldset>
        <div className={pairs}>
          <Field id={id('country')} label={importing ? 'Negara asal' : 'Negara tujuan'} error={errors.country}>
            {input('country', { placeholder: importing ? 'mis. Tiongkok' : 'mis. Belanda', autoComplete: 'off' })}
          </Field>
          <Field id={id('port')} label={importing ? 'Pelabuhan muat' : 'Pelabuhan bongkar'} optional>
            {input('port', { placeholder: importing ? 'mis. Ningbo' : 'mis. Rotterdam' })}
          </Field>
        </div>
        <Field id={id('schedule')} label="Perkiraan jadwal" optional>
          {input('schedule', { placeholder: 'mis. akhir November 2026' })}
        </Field>
        <Field id={id('note')} label="Catatan" optional>
          <textarea {...bind('note')} rows={4} onChange={(e) => set('note')(e.target.value)} className={`${INPUT} min-h-28 py-3`} />
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
