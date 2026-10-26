// Kontak & formulir enquiry Portline. Kiri: kepala section, kantor pusat (alamat + "View on map", telepon, email, jam
// kantor) dan daftar kantor regional bergaris tipis. Kanan: formulir berbahasa situs (nama, perusahaan, email, telepon,
// jenis pertanyaan, unit bisnis, pesan). JUJUR: formulir hanya MENYUSUN pesan — setelah lolos validasi, pesan tampil apa
// adanya beserta tombol "Open WhatsApp" dan "Send by email" (mailto dengan subjek & isi). Tidak ada data yang dikirim ke
// server atau disimpan. Tombol lain di halaman (kartu perusahaan grup, "Track a shipment", media, karier) bisa mengisi
// awal jenis pertanyaan / unit bisnis lewat EnquiryContext.
import { Check, ChevronDown, CircleAlert, Clock, Lock, Mail, MapPin, PencilLine, Phone } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, mailHref, telHref, text, whatsappHref } from '../shared/utils';
import { useEnquiry } from './context';
import { EMPTY_ENQUIRY, enquiryMailto, enquiryMessage, validateEnquiry, type EnquiryErrors, type EnquiryForm, type PortlineModel } from './model';
import { BTN, C, CARD, DISPLAY, INPUT, SECTION_PAD, TYPE_P } from './styles';
import { SectionHead } from './ui';

function Field({ id, label, error, optional, optionalLabel, required, children }: { id: string; label: string; error?: string; optional?: boolean; optionalLabel: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`mb-1.5 block text-[13.5px] font-semibold ${C.ink}`}>
        {label}
        {required && (
          <span aria-hidden className="text-(--pl-ink)">
            {' '}
            *
          </span>
        )}
        {optional && <span className={`font-normal ${C.muted}`}> ({optionalLabel})</span>}
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

const REQUIRED: (keyof EnquiryForm)[] = ['name', 'email', 'phone', 'type', 'message'];

function EnquiryFormCard({ m }: { m: PortlineModel }) {
  const { contact } = m;
  const f = m.ui.form;
  const baseId = useId();
  const { prefill } = useEnquiry();
  const [form, setForm] = useState<EnquiryForm>(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<keyof EnquiryForm, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const [appliedPrefill, setAppliedPrefill] = useState(0);

  // Isian awal dari tombol lain (sekali per klik; disesuaikan saat render, bukan di effect); jenis/unit hanya bila ada
  // di pilihan
  if (prefill && prefill.id !== appliedPrefill) {
    setAppliedPrefill(prefill.id);
    setSent(null);
    setForm((cur) => ({
      ...cur,
      type: prefill.type !== undefined && (prefill.type === '' || m.types.includes(prefill.type)) ? prefill.type : cur.type,
      unit: prefill.unit !== undefined && (prefill.unit === '' || m.units.includes(prefill.unit)) ? prefill.unit : cur.unit,
    }));
  }

  const wa = whatsappHref(m.whatsapp);
  const mail = mailHref(m.email);
  const title = text(contact, 'form_title') || f.title;
  const intro = text(contact, 'form_text');
  const button = text(contact, 'form_button') || f.submit;
  const id = (key: keyof EnquiryForm) => `${baseId}-${key}`;
  const set = (key: keyof EnquiryForm) => (value: string) => {
    setForm((cur) => ({ ...cur, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: keyof EnquiryForm) => (errors[key] ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const) : {});
  const ring = (key: keyof EnquiryForm) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  const card = `p-5 @3xl:p-8 ${CARD}`;

  if (!wa && !mail) {
    return (
      <div className={card}>
        <h3 className={`${TYPE_P.h3} ${C.ink}`}>{title}</h3>
        <p className={`mt-2 ${TYPE_P.small} ${C.body}`}>{f.noChannel}</p>
      </div>
    );
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateEnquiry(form, m.types, m.lang);
    setErrors(found);
    const first = REQUIRED.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(enquiryMessage(m.companyName, form, m.lang));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  if (sent) {
    const waLink = whatsappHref(m.whatsapp, sent);
    const mailLink = enquiryMailto(m.email, f.subject(form.type, m.companyName), sent);
    return (
      <div className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${TYPE_P.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#DCFCE7] text-[#15803D]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          {f.readyTitle}
        </h3>
        <p className={`mt-2 ${TYPE_P.small} ${C.body}`}>{f.readyText}</p>
        <pre className={`mt-4 whitespace-pre-wrap rounded-[6px] bg-(--pl-ice) p-4 font-sans text-[13.5px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-5 flex flex-col gap-2.5 @xl:flex-row @xl:flex-wrap">
          {waLink && (
            <ActionLink action={{ kind: 'external', href: waLink }} className={BTN.primary}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              {f.openWhatsapp}
            </ActionLink>
          )}
          {mailLink && (
            <ActionLink action={{ kind: 'external', href: mailLink }} className={waLink ? BTN.outline : BTN.primary}>
              <Mail aria-hidden className="h-4 w-4 shrink-0" />
              {f.sendEmail}
            </ActionLink>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={BTN.outline}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            {f.edit}
          </button>
        </div>
      </div>
    );
  }

  const select = (key: 'type' | 'unit', label: string, placeholder: string, options: string[], required: boolean) =>
    options.length > 0 && (
      <Field id={id(key)} label={label} error={errors[key]} optional={!required} optionalLabel={f.optional} required={required}>
        <div className="relative">
          <select
            ref={(el) => {
              refs.current[key] = el;
            }}
            id={id(key)}
            value={form[key]}
            onChange={(e) => set(key)(e.target.value)}
            className={`${INPUT} h-12 appearance-none pr-10 ${ring(key)}`}
            {...invalid(key)}
          >
            <option value="">{placeholder}</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
        </div>
      </Field>
    );

  const input = (key: 'name' | 'company' | 'email' | 'phone', label: string, props: { type: string; autoComplete: string; inputMode?: 'email' | 'tel' }, required: boolean) => (
    <Field id={id(key)} label={label} error={errors[key]} optional={!required} optionalLabel={f.optional} required={required}>
      <input
        ref={(el) => {
          refs.current[key] = el;
        }}
        id={id(key)}
        type={props.type}
        inputMode={props.inputMode}
        autoComplete={props.autoComplete}
        maxLength={key === 'email' ? 120 : 80}
        value={form[key]}
        onChange={(e) => set(key)(e.target.value)}
        className={`${INPUT} h-12 ${ring(key)}`}
        {...invalid(key)}
      />
    </Field>
  );

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={`${baseId}-title`} className={card}>
      <h3 id={`${baseId}-title`} className={`${TYPE_P.h3} ${C.ink}`}>
        {title}
      </h3>
      {intro && <p className={`mt-2 ${TYPE_P.small} ${C.body}`}>{intro}</p>}
      <div className="mt-6 grid gap-4 @xl:grid-cols-2">
        {input('name', f.name, { type: 'text', autoComplete: 'name' }, true)}
        {input('company', f.company, { type: 'text', autoComplete: 'organization' }, false)}
        {input('email', f.email, { type: 'email', autoComplete: 'email', inputMode: 'email' }, true)}
        {input('phone', f.phone, { type: 'tel', autoComplete: 'tel', inputMode: 'tel' }, false)}
        {select('type', f.type, f.typePlaceholder, m.types, true)}
        {select('unit', f.unit, f.unitPlaceholder, m.units, false)}
        <div className="@xl:col-span-2">
          <Field id={id('message')} label={f.message} error={errors.message} optionalLabel={f.optional} required>
            <textarea
              ref={(el) => {
                refs.current.message = el;
              }}
              id={id('message')}
              rows={4}
              maxLength={800}
              placeholder={f.messagePlaceholder}
              value={form.message}
              onChange={(e) => set('message')(e.target.value)}
              className={`${INPUT} min-h-28 py-3 ${ring('message')}`}
              {...invalid('message')}
            />
          </Field>
        </div>
      </div>
      <button type="submit" className={`${BTN.primary} mt-6 w-full @xl:w-auto`}>
        {wa ? <WhatsAppIcon className="h-5 w-5 shrink-0" /> : <Mail aria-hidden className="h-4 w-4 shrink-0" />}
        {button}
      </button>
      <p className={`mt-3 flex items-start gap-2 text-[12.5px] leading-snug ${C.muted}`}>
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {f.privacy}
      </p>
    </form>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 py-4">
      <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] bg-(--pl-ice) text-(--pl-ink)">
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`text-[11.5px] font-semibold uppercase tracking-[0.14em] ${C.muted}`}>{label}</p>
        <div className={`mt-1 text-[15px] leading-relaxed ${C.ink}`}>{children}</div>
      </div>
    </div>
  );
}

export function Contact({ m }: { m: PortlineModel }) {
  const { contact } = m;
  const address = text(contact, 'address');
  const hours = text(contact, 'hours');
  const tel = telHref(m.phone);
  const mail = mailHref(m.email);
  const offices = list(contact, 'offices', 6).filter((item) => field(item, 'city'));
  const link = 'underline decoration-(--pl-deep)/25 underline-offset-4 transition-colors hover:decoration-(--tpl-accent)';
  return (
    <TemplateSection sectionKey="contact" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className="grid gap-10 @5xl:grid-cols-12 @5xl:gap-12 @7xl:gap-16">
          <div className="min-w-0 @5xl:col-span-5">
            <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} />
            <div className="mt-8 divide-y divide-(--pl-deep)/[0.1] border-y border-(--pl-deep)/[0.1]">
              {address && (
                <InfoRow icon={<MapPin className="h-[18px] w-[18px]" strokeWidth={1.8} />} label={m.ui.headquarters}>
                  <p>{address}</p>
                  {m.map.link && (
                    <ActionLink action={{ kind: 'external', href: m.map.link }} className={`mt-1 inline-flex min-h-9 items-center text-[13.5px] font-semibold text-(--pl-ink) ${link}`}>
                      {m.ui.viewMap}
                    </ActionLink>
                  )}
                </InfoRow>
              )}
              {m.phone && (
                <InfoRow icon={<Phone className="h-[18px] w-[18px]" strokeWidth={1.8} />} label={m.ui.call}>
                  {tel ? (
                    <ActionLink action={{ kind: 'external', href: tel }} className={`inline-flex min-h-8 items-center ${link}`}>
                      {m.phone}
                    </ActionLink>
                  ) : (
                    m.phone
                  )}
                </InfoRow>
              )}
              {m.email && (
                <InfoRow icon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.8} />} label={m.ui.email}>
                  {mail ? (
                    <ActionLink action={{ kind: 'external', href: mail }} className={`inline-flex min-h-8 items-center [overflow-wrap:anywhere] ${link}`}>
                      {m.email}
                    </ActionLink>
                  ) : (
                    m.email
                  )}
                </InfoRow>
              )}
              {hours && (
                <InfoRow icon={<Clock className="h-[18px] w-[18px]" strokeWidth={1.8} />} label={m.ui.hours}>
                  {hours}
                </InfoRow>
              )}
            </div>
            {offices.length > 0 && (
              <div className="mt-8">
                <h3 className={`${DISPLAY} text-[15px] font-bold uppercase tracking-[0.08em] ${C.ink}`}>{m.ui.offices}</h3>
                <ul className="mt-3 grid gap-3 @xl:grid-cols-2">
                  {offices.map((item, i) => {
                    const officeTel = telHref(field(item, 'phone'));
                    return (
                      <Reveal as="li" key={`${field(item, 'city')}-${i}`} delay={stagger(i, 60)} className="rounded-[6px] bg-(--pl-ice) p-4">
                        <p className={`${DISPLAY} text-[17px] font-semibold ${C.ink}`}>{field(item, 'city')}</p>
                        {field(item, 'address') && <p className={`mt-0.5 ${TYPE_P.small} ${C.body}`}>{field(item, 'address')}</p>}
                        {field(item, 'phone') &&
                          (officeTel ? (
                            <ActionLink action={{ kind: 'external', href: officeTel }} className={`mt-1 inline-flex min-h-8 items-center text-[13.5px] font-semibold tabular-nums text-(--pl-ink) ${link}`}>
                              {field(item, 'phone')}
                            </ActionLink>
                          ) : (
                            <p className="mt-1 text-[13.5px] tabular-nums">{field(item, 'phone')}</p>
                          ))}
                      </Reveal>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          <Reveal variant="fade" className="min-w-0 @5xl:col-span-7 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+88px)] @5xl:self-start">
            <EnquiryFormCard m={m} />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
