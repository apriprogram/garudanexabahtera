// Formulir permintaan penawaran (di dalam section Kontak). Menanyakan nama, perusahaan, kebutuhan, produk & spesifikasi,
// volume, negara asal, Incoterm, lokasi pabrik, kapan dibutuhkan, dan catatan; setelah lolos validasi pesannya
// ditampilkan apa adanya dengan tombol "Buka WhatsApp" (tanpa nomor WhatsApp: kirim lewat email; tanpa keduanya: salin
// pesan). JUJUR: formulir hanya MENYUSUN pesan — tidak ada fetch, tidak ada localStorage, tidak ada <form action>; data
// tidak disimpan di website dan tidak ada pembayaran. Galat: aria-invalid + aria-describedby, fokus ke isian pertama
// yang salah. Pratinjau CMS: tombol WhatsApp tidak membuka tautan (perilaku ActionLink).
import { Check, ChevronDown, CircleAlert, Copy, Lock, Mail, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { field, text } from '../shared/utils';
import {
  EMPTY_INQUIRY,
  INCOTERMS,
  INQUIRY_LIMITS,
  ORIGIN_ANY,
  inquiryMessage,
  mailtoHref,
  needOptions,
  validateInquiry,
  type InquiryErrors,
  type InquiryForm,
  type NusaNiagaModel,
} from './model';
import { BTN, C, CARD, INPUT, INPUT_ERROR, INPUT_IDLE, TYPE_N } from './styles';

/** Urutan isian di layar (fokus ke galat pertama mengikuti urutan ini). */
const ORDER: (keyof InquiryForm)[] = ['name', 'company', 'need', 'volume', 'product', 'origin', 'incoterm', 'location', 'start', 'note'];

/** Kalimat jujur bila "Keterangan formulir" dikosongkan; netral saluran (tanpa nomor WhatsApp pesan dikirim lewat email/salin). */
const FALLBACK_NOTE = 'Formulir ini hanya menyusun pesan untuk tim kami; data tidak disimpan di website.';

function Field({ id, label, optional = false, error, className = '', children }: { id: string; label: string; optional?: boolean; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`flex items-baseline justify-between gap-3 text-[14px] font-semibold ${C.ink}`}>
        <span>
          {label}
          {optional && <span className="sr-only"> (opsional)</span>}
        </span>
        {optional && (
          <span aria-hidden className={`text-[12.5px] font-normal ${C.subtle}`}>
            Opsional
          </span>
        )}
      </label>
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Inquiry({ m }: { m: NusaNiagaModel }) {
  const { contact } = m;
  const baseId = useId();
  const [form, setForm] = useState<InquiryForm>(EMPTY_INQUIRY);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const needs = needOptions(contact);
  const countries = m.shown('coverage') ? m.items('coverage').map((item) => field(item, 'country')) : [];
  const title = text(contact, 'form_title');
  const note = text(contact, 'form_text') || FALLBACK_NOTE;
  // Tanpa nomor WhatsApp pesan dikirim lewat email atau disalin: tombol tidak menjanjikan WhatsApp
  const hasWa = !!m.waAction;
  const button = hasWa ? text(contact, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const email = text(contact, 'email');
  const id = (key: keyof InquiryForm) => `${baseId}-${key}`;

  const set = (key: keyof InquiryForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: keyof InquiryForm) => ({
    id: id(key),
    value: form[key],
    ...(errors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const control = (key: keyof InquiryForm, size = 'h-12') => `${INPUT} ${size} ${errors[key] ? INPUT_ERROR : INPUT_IDLE}`;
  /** Fokus ke isian (dicari lewat id di dalam kartu formulir, dipanggil dari event handler). */
  const focusField = (key: keyof InquiryForm) => {
    const el = cardRef.current?.querySelector<HTMLElement>(`[id="${id(key)}"]`);
    el?.focus();
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateInquiry(form, { needs });
    setErrors(found);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      focusField(first);
      return;
    }
    setSent(inquiryMessage(form, m.companyName));
    setCopied(false);
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const card = `${CARD} p-6 @3xl:p-8 @5xl:p-10`;
  const wa = sent ? m.waWith(sent) : null;
  const mail = sent && !wa ? mailtoHref(email, 'Permintaan penawaran', sent) : '';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sent ?? '');
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const result = sent && (
      <div className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 focus:outline-none ${C.ink} ${TYPE_N.h3}`}>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-(--nn-tint) text-(--nn-ink)">
            <Check className="h-4 w-4" strokeWidth={2.6} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-3 ${TYPE_N.small} ${C.muted}`}>
          {wa ? 'Periksa isinya, lalu buka WhatsApp untuk mengirim ke tim kami.' : mail ? 'Periksa isinya, lalu kirim lewat email ke tim kami.' : 'Periksa isinya, lalu salin dan kirim ke tim kami.'}
        </p>
        <pre className={`mt-5 whitespace-pre-wrap rounded-xl bg-white p-4 font-sans text-[14px] leading-relaxed ring-1 ring-inset ring-[#141821]/[0.12] [overflow-wrap:anywhere] ${C.ink}`}>
          {sent}
        </pre>
        <div className="mt-6 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap @xl:items-center">
          {wa && (
            <ActionLink action={wa} className={`${BTN.primary} ${BTN.lg}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          )}
          {mail && (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.primary} ${BTN.lg}`}>
              <Mail aria-hidden className="h-5 w-5 shrink-0" />
              Kirim lewat email
            </ActionLink>
          )}
          {!wa && !mail && (
            <button type="button" onClick={copy} className={`${BTN.primary} ${BTN.lg}`}>
              {copied ? <Check aria-hidden className="h-5 w-5 shrink-0" /> : <Copy aria-hidden className="h-5 w-5 shrink-0" />}
              {copied ? 'Tersalin' : 'Salin pesan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => focusField('name'), 0);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 px-2 text-[15px] font-semibold text-(--nn-ink) underline decoration-current/30 underline-offset-[5px] transition-colors hover:decoration-current"
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah data
          </button>
        </div>
      </div>
  );

  const formView = (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : 'Formulir permintaan penawaran'} className={card}>
      {title && (
        <h3 id={`${baseId}-title`} className={`${C.ink} ${TYPE_N.h3} @3xl:text-[22px]`}>
          {title}
        </h3>
      )}
      {/* Dua kolom isian mengikuti lebar formulir sendiri (wadah bernama), bukan lebar halaman: di kolom sempit
          (layar 1024–1279px) isian tetap satu kolom agar placeholder tidak terpotong */}
      <div className={`@container/fields ${title ? 'mt-6' : ''}`}>
        <div className="grid gap-x-5 gap-y-5 @md/fields:grid-cols-2">
          <Field id={id('name')} label="Nama" error={errors.name}>
            <input {...bind('name')} type="text" autoComplete="name" maxLength={INQUIRY_LIMITS.name} onChange={(e) => set('name')(e.target.value)} className={control('name')} />
          </Field>
          <Field id={id('company')} label="Perusahaan" error={errors.company}>
            <input
              {...bind('company')}
              type="text"
              autoComplete="organization"
              maxLength={INQUIRY_LIMITS.company}
              onChange={(e) => set('company')(e.target.value)}
              className={control('company')}
            />
          </Field>
          <Field id={id('need')} label="Kebutuhan" error={errors.need}>
            <div className="relative">
              <select {...bind('need')} onChange={(e) => set('need')(e.target.value)} className={`${control('need')} appearance-none pr-10`}>
                <option value="">Pilih kebutuhan</option>
                {needs.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
            </div>
          </Field>
          <Field id={id('volume')} label="Perkiraan volume" error={errors.volume}>
            <input
              {...bind('volume')}
              type="text"
              autoComplete="off"
              maxLength={INQUIRY_LIMITS.volume}
              placeholder="mis. 20 ton/bulan atau 2 unit"
              onChange={(e) => set('volume')(e.target.value)}
              className={control('volume')}
            />
          </Field>
          <Field id={id('product')} label="Produk & spesifikasi" error={errors.product} className="@md/fields:col-span-2">
            <input
              {...bind('product')}
              type="text"
              autoComplete="off"
              maxLength={INQUIRY_LIMITS.product}
              placeholder="mis. resin PP homopolimer, MFI 12"
              onChange={(e) => set('product')(e.target.value)}
              className={control('product')}
            />
          </Field>
          <Field id={id('origin')} label="Negara asal" optional>
            {countries.length > 0 ? (
              <div className="relative">
                <select {...bind('origin')} onChange={(e) => set('origin')(e.target.value)} className={`${control('origin')} appearance-none pr-10`}>
                  <option value={ORIGIN_ANY}>{ORIGIN_ANY}</option>
                  {countries.map((country, i) => (
                    <option key={`${country}-${i}`} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
              </div>
            ) : (
              <input
                {...bind('origin')}
                value={form.origin === ORIGIN_ANY ? '' : form.origin}
                type="text"
                autoComplete="off"
                maxLength={INQUIRY_LIMITS.origin}
                placeholder="mis. Korea Selatan"
                onChange={(e) => set('origin')(e.target.value)}
                className={control('origin')}
              />
            )}
          </Field>
          <Field id={id('incoterm')} label="Incoterm" optional>
            <div className="relative">
              <select {...bind('incoterm')} onChange={(e) => set('incoterm')(e.target.value)} className={`${control('incoterm')} appearance-none pr-10`}>
                {INCOTERMS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
            </div>
          </Field>
          <Field id={id('location')} label="Lokasi pabrik / kota tujuan" error={errors.location}>
            <input
              {...bind('location')}
              type="text"
              autoComplete="off"
              maxLength={INQUIRY_LIMITS.location}
              placeholder="mis. Karawang, Jawa Barat"
              onChange={(e) => set('location')(e.target.value)}
              className={control('location')}
            />
          </Field>
          <Field id={id('start')} label="Mulai dibutuhkan" optional>
            <input
              {...bind('start')}
              type="text"
              autoComplete="off"
              maxLength={INQUIRY_LIMITS.start}
              placeholder="mis. Januari 2027"
              onChange={(e) => set('start')(e.target.value)}
              className={control('start')}
            />
          </Field>
          <Field id={id('note')} label="Catatan" optional className="@md/fields:col-span-2">
            <textarea
              {...bind('note')}
              rows={4}
              maxLength={INQUIRY_LIMITS.note}
              onChange={(e) => set('note')(e.target.value)}
              className={control('note', 'min-h-28 py-3')}
            />
          </Field>
        </div>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-7 w-full`}>
        {hasWa && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
        {button}
      </button>
      <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {note}
      </p>
    </form>
  );

  // Pembungkus tetap (formulir ↔ pesan bergantian di dalamnya): tempat mencari isian untuk fokus. BUKAN aria-live:
  // fokus sudah pindah ke judul "Pesan siap dikirim" / isian pertama yang salah, jadi pembaca layar tidak membacakan
  // seluruh formulir atau pesan dua kali. Hanya status salin yang diumumkan (tombolnya tetap terfokus).
  return (
    <div ref={cardRef}>
      {result || formView}
      <p className="sr-only" aria-live="polite">
        {sent && copied ? 'Pesan tersalin.' : ''}
      </p>
    </div>
  );
}
