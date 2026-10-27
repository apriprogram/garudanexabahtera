// Formulir permintaan penawaran (bagian Kontak) di dalam kartu kraft. Isian: nama, perusahaan, negara & pelabuhan
// tujuan, komoditas (pilihan per kategori dari kartu Komoditas + "Lainnya"), volume + satuan, Incoterm, target
// pengiriman, sampel, catatan. JUJUR: formulir hanya MENYUSUN pesan WhatsApp untuk tim penjualan — tidak ada data yang
// dikirim ke server atau disimpan (tanpa localStorage), tidak ada pembayaran. Setelah lolos validasi, pesan tampil apa
// adanya + "Buka WhatsApp" (pratinjau: tautan tidak dibuka) dan "Ubah isian". Tanpa nomor WhatsApp → keterangan +
// tautan email (bila ada) berisi pesan yang sama. Tautan "Minta penawaran" di kartu komoditas memilih komoditasnya.
import { Check, ChevronDown, CircleAlert, Mail, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { ActionLink } from '../shared/Shell';
import { field, text } from '../shared/utils';
import {
  EMPTY_QUOTE,
  labelList,
  NOTES_MAX,
  OTHER_PRODUCT,
  QUOTE_ORDER,
  quoteMailHref,
  quoteMessage,
  UNKNOWN_INCOTERM,
  validateQuote,
  type QuoteErrors,
  type QuoteForm,
  type QuotePreset,
  type SaudagarModel,
} from './model';
import { BTN, C, CARD, INPUT, INPUT_BASE, TYPE_S } from './styles';

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function Field({ id, label, error, hint, optional = false, className = '', children }: { id: string; label: string; error?: string; hint?: ReactNode; optional?: boolean; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-medium ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (opsional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={`mt-1.5 text-[12.5px] ${C.muted}`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const SELECT = `${INPUT} appearance-none pr-10`;

function Chevron() {
  return <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />;
}

export function InquiryForm({ m, preset }: { m: SaudagarModel; preset: QuotePreset }) {
  const { contact } = m;
  const baseId = useId();
  const [form, setForm] = useState<QuoteForm>(() => ({ ...EMPTY_QUOTE, product: preset.product }));
  const [errors, setErrors] = useState<QuoteErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [applied, setApplied] = useState(preset.n);
  const refs = useRef<Partial<Record<keyof QuoteForm, Control | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);

  // Tautan kartu komoditas diklik → pilih komoditasnya (juga dari layar pesan: kembali ke formulir)
  if (preset.n !== applied) {
    setApplied(preset.n);
    setForm((f) => ({ ...f, product: preset.product }));
    setSent(null);
  }

  const title = text(contact, 'form_title');
  const note = text(contact, 'form_note');
  const units = labelList(contact, 'units', 5);
  const incoterms = labelList(contact, 'incoterms', 6);
  const groups = m.tabs.map((tab) => ({ name: tab.name, items: tab.items.map((item) => field(item, 'name')) }));
  const unit = form.unit || units[0] || '';
  const id = (key: keyof QuoteForm) => `${baseId}-${key}`;
  const set = <K extends keyof QuoteForm>(key: K) => (value: QuoteForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const describe = (key: keyof QuoteForm, hint = false) =>
    errors[key]
      ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const)
      : hint
        ? ({ 'aria-describedby': `${id(key)}-hint` } as const)
        : {};
  const ring = (key: keyof QuoteForm) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  const bind = (key: keyof QuoteForm) => (el: Control | null) => {
    refs.current[key] = el;
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateQuote(form);
    setErrors(found);
    const first = QUOTE_ORDER.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(quoteMessage({ ...form, unit }, { greeting: text(contact, 'form_greeting'), company: m.companyName }));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const card = `p-6 @3xl:p-10 ${CARD.kraft}`;

  if (sent) {
    const wa = m.waWith(sent);
    const mail = quoteMailHref(text(contact, 'email'), sent, form.product);
    return (
      <div className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 focus:outline-none ${C.ink} ${TYPE_S.h3}`}>
          <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#221A13] text-[#F7F2E8]">
            <Check className="h-4 w-4" strokeWidth={2.4} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-3 text-[14.5px] leading-relaxed ${C.muted}`}>
          {wa ? 'Periksa isinya, lalu buka WhatsApp untuk mengirim ke tim penjualan.' : 'Nomor WhatsApp belum diisi. Salin pesan ini atau kirim lewat email.'}
        </p>
        <pre
          aria-live="polite"
          className={`mt-5 whitespace-pre-wrap rounded-[4px] bg-white p-5 font-sans text-[14px] leading-relaxed ring-1 ring-inset ring-[#221A13]/[0.12] [overflow-wrap:anywhere] ${C.ink}`}
        >
          {sent}
        </pre>
        <div className="mt-6 flex flex-col gap-3 @xl:flex-row @xl:items-center">
          {wa ? (
            <ActionLink action={wa} className={`${BTN.ink} ${BTN.lg}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          ) : (
            mail && (
              <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.ink} ${BTN.lg}`}>
                <Mail aria-hidden className="h-5 w-5 shrink-0" />
                Kirim lewat email
              </ActionLink>
            )
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium ring-1 ring-inset ring-[#221A13]/[0.2] transition-colors duration-300 hover:bg-white ${C.ink}`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Ubah isian
          </button>
        </div>
        {note && <p className={`mt-5 text-[12.5px] leading-snug ${C.muted}`}>{note}</p>}
      </div>
    );
  }

  const input = (key: 'name' | 'company' | 'country' | 'port' | 'shipment', opts: { label: string; optional?: boolean; max: number; autoComplete?: string; placeholder?: string }) => (
    <Field id={id(key)} label={opts.label} error={errors[key]} optional={opts.optional}>
      <input
        ref={bind(key)}
        id={id(key)}
        type="text"
        autoComplete={opts.autoComplete ?? 'off'}
        maxLength={opts.max}
        placeholder={opts.placeholder}
        value={form[key]}
        onChange={(e) => set(key)(e.target.value)}
        className={`${INPUT} ${ring(key)}`}
        {...describe(key)}
      />
    </Field>
  );

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={title ? `${baseId}-title` : undefined}
      aria-label={title ? undefined : 'Formulir permintaan penawaran'}
      className={card}
    >
      {title && (
        <h3 id={`${baseId}-title`} className={`${C.ink} ${TYPE_S.h3}`}>
          {title}
        </h3>
      )}
      <p className={`mt-2 text-[14px] leading-relaxed ${C.muted}`}>Isian bertanda (opsional) boleh dikosongkan.</p>
      <div className="mt-6 grid gap-5 @3xl:grid-cols-2 @3xl:gap-x-5">
        {input('name', { label: 'Nama', max: 80, autoComplete: 'name' })}
        {input('company', { label: 'Perusahaan', optional: true, max: 100, autoComplete: 'organization' })}
        {input('country', { label: 'Negara tujuan', max: 60, autoComplete: 'country-name', placeholder: 'mis. Jepang' })}
        {input('port', { label: 'Pelabuhan tujuan', optional: true, max: 60, placeholder: 'mis. Osaka' })}

        <Field id={id('product')} label="Komoditas" error={errors.product} className="@3xl:col-span-2">
          {groups.length > 0 ? (
            <div className="relative">
              <select
                ref={bind('product')}
                id={id('product')}
                value={form.product}
                onChange={(e) => set('product')(e.target.value)}
                className={`${SELECT} ${ring('product')}`}
                {...describe('product')}
              >
                <option value="">Pilih komoditas</option>
                {groups.map((group) => (
                  <optgroup key={group.name} label={group.name}>
                    {group.items.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value={OTHER_PRODUCT}>{OTHER_PRODUCT}</option>
              </select>
              <Chevron />
            </div>
          ) : (
            <input
              ref={bind('product')}
              id={id('product')}
              type="text"
              maxLength={60}
              placeholder="mis. Kopi arabika"
              value={form.product}
              onChange={(e) => set('product')(e.target.value)}
              className={`${INPUT} ${ring('product')}`}
              {...describe('product')}
            />
          )}
        </Field>

        <Field id={id('volume')} label="Volume" error={errors.volume}>
          <div className={`grid gap-2 ${units.length > 0 ? 'grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]' : ''}`}>
            <input
              ref={bind('volume')}
              id={id('volume')}
              type="text"
              inputMode="decimal"
              maxLength={12}
              placeholder="mis. 2"
              value={form.volume}
              onChange={(e) => set('volume')(e.target.value)}
              className={`${INPUT} ${ring('volume')}`}
              {...describe('volume')}
            />
            {units.length > 0 && (
              <div className="relative">
                <select aria-label="Satuan volume" value={unit} onChange={(e) => set('unit')(e.target.value)} className={SELECT}>
                  {units.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
                <Chevron />
              </div>
            )}
          </div>
        </Field>

        <Field id={id('incoterm')} label="Incoterm" optional>
          <div className="relative">
            <select id={id('incoterm')} value={form.incoterm} onChange={(e) => set('incoterm')(e.target.value)} className={SELECT}>
              <option value="">Pilih Incoterm</option>
              {incoterms.map((label) => (
                <option key={label} value={label}>
                  {label}
                </option>
              ))}
              <option value={UNKNOWN_INCOTERM}>{UNKNOWN_INCOTERM}</option>
            </select>
            <Chevron />
          </div>
        </Field>

        {input('shipment', { label: 'Target pengiriman', optional: true, max: 40, placeholder: 'mis. Maret 2027' })}

        <div className="flex min-w-0 items-end">
          <label htmlFor={id('sample')} className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-[4px] bg-white px-4 text-[14.5px] ring-1 ring-inset ring-[#221A13]/[0.16] ${C.ink}`}>
            <input
              id={id('sample')}
              type="checkbox"
              checked={form.sample}
              onChange={(e) => set('sample')(e.target.checked)}
              className="h-5 w-5 shrink-0 accent-[#221A13]"
            />
            Kirimi saya sampel sebelum kontrak
          </label>
        </div>

        <Field
          id={id('notes')}
          label="Catatan"
          optional
          error={errors.notes}
          hint={`${form.notes.length}/${NOTES_MAX} karakter`}
          className="@3xl:col-span-2"
        >
          <textarea
            ref={bind('notes')}
            id={id('notes')}
            rows={4}
            maxLength={NOTES_MAX}
            placeholder="mis. grade, kemasan khusus, atau jadwal panen yang Anda incar"
            value={form.notes}
            onChange={(e) => set('notes')(e.target.value)}
            className={`${INPUT_BASE} min-h-28 py-3 ${ring('notes')}`}
            {...describe('notes', true)}
          />
        </Field>
      </div>

      <button type="submit" className={`${BTN.ink} ${BTN.lg} mt-7 w-full @xl:w-auto`}>
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        Susun pesan WhatsApp
      </button>
      {note && <p className={`mt-4 text-[12.5px] leading-snug ${C.muted}`}>{note}</p>}
    </form>
  );
}
