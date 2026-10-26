// Penutup Altura: `insights` (panel krem membulat: judul + tombol, tiga kartu artikel berfoto dengan chip kategori warna
// tema dan tanggal en-US), `cta` (panel foto malam gelap besar: judul terpusat + dua tombol), dan `contact` (judul,
// telepon/email/jam layanan, daftar kantor, peta opsional, dan formulir enquiry berbahasa Inggris).
// JUJUR: formulir hanya MENYUSUN pesan untuk WhatsApp atau email perusahaan — tidak ada data yang dikirim ke server atau
// disimpan. Setelah lolos validasi, pesan ditampilkan apa adanya beserta tombol "Open WhatsApp" / "Send by email"
// (pratinjau: tautan tidak dibuka). Tanpa WhatsApp & email perusahaan → formulir diganti ajakan menelepon.
import { Check, ChevronDown, CircleAlert, Clock, Lock, Mail, MapPin, PencilLine, Phone } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { CONTAINER } from '../shared/layout';
import { MapEmbed } from '../shared/media';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, mailHref, telHref, text, whatsappHref } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  EMPTY_ENQUIRY,
  ENQUIRY_ORDER,
  enquiryMailto,
  enquiryMessage,
  parseIsoDate,
  validateEnquiry,
  type AlturaModel,
  type EnquiryErrors,
  type EnquiryForm,
} from './model';
import { ALTURA_PHOTOS } from './photos';
import { BTN, C, DISPLAY, INPUT, OUTER, SECTION_PAD, TYPE_A } from './styles';
import { PillCta, PillTag, SectionHead } from './ui';

export function Insights({ m }: { m: AlturaModel }) {
  const { insights } = m;
  const items = m.items('insights');
  const action = m.linkOr(text(insights, 'button_url'), null);
  return (
    <TemplateSection sectionKey="insights" className="py-1.5 @5xl:py-2">
      <div className={OUTER}>
        <div className="rounded-[24px] bg-[#F2EFE7] py-16 @3xl:rounded-[28px] @5xl:py-24">
          <div className={CONTAINER}>
            <SectionHead
              layout="row"
              eyebrow={text(insights, 'eyebrow')}
              title={text(insights, 'title')}
              aside={<PillCta action={action} label={text(insights, 'button_label')} variant="white" size="md" />}
            />
            <ul className="mt-10 grid gap-x-5 gap-y-10 @3xl:grid-cols-3 @5xl:mt-14 @7xl:gap-x-8">
              {items.map((item, i) => {
                const title = field(item, 'title');
                const image = field(item, 'image');
                const date = parseIsoDate(field(item, 'date'));
                const rawDate = field(item, 'date');
                const link = m.linkOr(field(item, 'url'), null);
                return (
                  <Reveal as="li" key={`${title}-${i}`} delay={stagger(i, 90)} className="min-w-0">
                    <article className="group relative">
                      {hasImage(image) && (
                        <KitPhoto
                          src={image}
                          alt={ALTURA_PHOTOS.alt(image, title)}
                          zoom
                          sizes="(min-width: 768px) 31vw, 92vw"
                          className="aspect-[3/2] rounded-[20px]"
                          imgClassName="transition-[scale] duration-700 group-hover:scale-[1.04]"
                        />
                      )}
                      <div className={`flex items-center justify-between gap-3 ${hasImage(image) ? 'mt-5' : ''}`}>
                        {field(item, 'category') && (
                          <span className="inline-flex h-7 items-center rounded-full bg-(--tpl-accent) px-3 text-[12px] font-semibold text-(--tpl-on-accent)">
                            {field(item, 'category')}
                          </span>
                        )}
                        {rawDate &&
                          (date ? (
                            <time dateTime={date.iso} className={`text-[13px] ${C.muted}`}>
                              {date.label}
                            </time>
                          ) : (
                            <span className={`text-[13px] ${C.muted}`}>{rawDate}</span>
                          ))}
                      </div>
                      <h3 className={`mt-3 text-pretty ${C.ink} ${TYPE_A.h3}`}>
                        {link ? (
                          <ActionLink
                            action={link}
                            className="underline-offset-4 after:absolute after:inset-0 after:rounded-[20px] after:content-[''] group-hover:underline"
                          >
                            {title}
                          </ActionLink>
                        ) : (
                          title
                        )}
                      </h3>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

export function Cta({ m }: { m: AlturaModel }) {
  const { cta } = m;
  const image = text(cta, 'image');
  const primary = m.linkOr(text(cta, 'primary_url'), m.contactAction ?? m.waAction);
  const secondary = m.linkOr(text(cta, 'secondary_url'), m.waAction);
  return (
    <TemplateSection sectionKey="cta" className="py-1.5 @5xl:py-2">
      <div className={OUTER}>
        <div data-tpl-tone="inverse" className="relative isolate overflow-hidden rounded-[24px] bg-(--al-deep) text-white @3xl:rounded-[28px]">
          {hasImage(image) && <KitPhoto src={image} alt="" fallback="none" parallax sizes="100vw" className="absolute inset-0 -z-20" />}
          <div aria-hidden className="al-cta-scrim absolute inset-0 -z-10" />
          <div className={`${CONTAINER} flex min-h-[460px] flex-col items-center justify-center py-20 text-center @5xl:min-h-[580px] @5xl:py-28`}>
            {text(cta, 'title') && (
              <Reveal as="h2" className={`max-w-[14ch] text-balance ${DISPLAY} text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] text-white @3xl:text-[56px] @6xl:text-[72px]`}>
                {text(cta, 'title')}
              </Reveal>
            )}
            {text(cta, 'subtitle') && (
              <Reveal as="p" delay={120} className={`mt-6 max-w-[52ch] text-pretty text-white/80 ${TYPE_A.lead}`}>
                {text(cta, 'subtitle')}
              </Reveal>
            )}
            <Reveal delay={220} className="mt-9 flex w-full flex-col items-stretch justify-center gap-3 @xl:w-auto @xl:flex-row @xl:items-center">
              <PillCta action={primary} label={text(cta, 'primary_label')} variant="accent" />
              <PillCta action={secondary} label={text(cta, 'secondary_label')} variant="glass" />
            </Reveal>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}

// ─── Kontak & formulir enquiry ────────────────────────────────────────────────

function Field({ id, label, error, optional = false, children }: { id: string; label: string; error?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-semibold ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (optional)</span>}
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

type FieldEl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function EnquiryCard({ m }: { m: AlturaModel }) {
  const { contact } = m;
  const baseId = useId();
  const [form, setForm] = useState<EnquiryForm>(EMPTY_ENQUIRY);
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<keyof EnquiryForm, FieldEl | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const interests = list(contact, 'interests', 8)
    .map((item) => field(item, 'name'))
    .filter(Boolean);
  const offices = m.offices.map((o) => o.city).filter(Boolean);
  const title = text(contact, 'form_title');
  const intro = text(contact, 'form_text');
  const canWhatsApp = !!whatsappHref(m.whatsapp);
  const canEmail = !!mailHref(m.email);
  const id = (key: keyof EnquiryForm) => `${baseId}-${key}`;
  const set = (key: keyof EnquiryForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: keyof EnquiryForm) => (errors[key] ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const) : {});
  const ring = (key: keyof EnquiryForm) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  const bind = (key: keyof EnquiryForm) => ({
    ref: (el: FieldEl | null) => {
      refs.current[key] = el;
    },
    id: id(key),
    value: form[key],
    onChange: (e: { target: { value: string } }) => set(key)(e.target.value),
    ...invalid(key),
  });

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateEnquiry(form, { interests, offices });
    setErrors(found);
    const first = ENQUIRY_ORDER.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(enquiryMessage(m.companyName, form));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const card = 'rounded-[24px] bg-[#F2EFE7] p-5 @3xl:rounded-[28px] @3xl:p-9 @7xl:p-11';

  if (!canWhatsApp && !canEmail) {
    const tel = telHref(m.phone);
    return (
      <div className={card}>
        {title && <h3 className={`${C.ink} ${TYPE_A.h3}`}>{title}</h3>}
        <p className={`mt-2 ${TYPE_A.body} ${C.muted}`}>Call our team and we will help you with your enquiry.</p>
        {tel && <PillCta action={{ kind: 'external', href: tel }} label={m.phone} variant="ink" size="md" className="mt-6" />}
      </div>
    );
  }

  if (sent) {
    const wa = canWhatsApp ? whatsappHref(m.whatsapp, sent) : '';
    const mail = canEmail ? enquiryMailto(m.email, form, sent) : '';
    return (
      <div className={card} aria-live="polite">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${C.ink} ${TYPE_A.h3} focus:outline-none`}>
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          Your message is ready
        </h3>
        <p className={`mt-2 ${TYPE_A.small} ${C.muted}`}>Check the details, then send it to our team by {wa && mail ? 'WhatsApp or email' : wa ? 'WhatsApp' : 'email'}.</p>
        <pre className={`mt-5 whitespace-pre-wrap rounded-[18px] bg-white p-4 font-sans text-[14px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-6 flex flex-col gap-2.5 @xl:flex-row @xl:flex-wrap">
          {wa && (
            <ActionLink action={{ kind: 'external', href: wa }} className={`${BTN.accent} ${BTN.lg}`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Open WhatsApp
            </ActionLink>
          )}
          {mail && (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BTN.ink} ${BTN.lg}`}>
              <Mail aria-hidden className="h-[18px] w-[18px] shrink-0" />
              Send by email
            </ActionLink>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`${BTN.white} ${BTN.lg}`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            Edit details
          </button>
        </div>
      </div>
    );
  }

  const select = (key: 'interest' | 'office', label: string, placeholder: string, options: string[], optional = false) =>
    options.length > 0 && (
      <Field id={id(key)} label={label} error={errors[key]} optional={optional}>
        <div className="relative">
          <select {...bind(key)} className={`${INPUT} h-12 appearance-none pr-10 ${ring(key)}`}>
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

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : 'Enquiry form'} className={card}>
      {title && (
        <h3 id={`${baseId}-title`} className={`${C.ink} ${DISPLAY} text-[24px] font-semibold leading-tight tracking-[-0.03em] @3xl:text-[28px]`}>
          {title}
        </h3>
      )}
      {intro && <p className={`mt-2 max-w-[52ch] ${TYPE_A.small} ${C.muted}`}>{intro}</p>}
      <div className="mt-6 grid gap-4 @xl:grid-cols-2">
        <Field id={id('name')} label="Full name" error={errors.name}>
          <input {...bind('name')} type="text" autoComplete="name" maxLength={80} className={`${INPUT} h-12 ${ring('name')}`} />
        </Field>
        <Field id={id('email')} label="Email" error={errors.email}>
          <input {...bind('email')} type="email" inputMode="email" autoComplete="email" maxLength={120} placeholder="name@company.com" className={`${INPUT} h-12 ${ring('email')}`} />
        </Field>
        <Field id={id('phone')} label="Phone" error={errors.phone} optional>
          <input {...bind('phone')} type="tel" inputMode="tel" autoComplete="tel" maxLength={24} placeholder="+65 8123 4567" className={`${INPUT} h-12 ${ring('phone')}`} />
        </Field>
        {select('interest', 'Your enquiry is about', 'Select a topic', interests)}
        {select('office', 'Preferred office', 'Any office', offices, true)}
        <div className="@xl:col-span-2">
          <Field id={id('message')} label="Message" error={errors.message}>
            <textarea
              {...bind('message')}
              rows={4}
              maxLength={600}
              placeholder="Tell us what you are looking for, your budget or timeline."
              className={`${INPUT} min-h-28 py-3 ${ring('message')}`}
            />
          </Field>
        </div>
      </div>
      <button type="submit" className={`group mt-6 w-full ${BTN.ink} h-[54px] pl-6 pr-1.5 text-[15px] @xl:w-auto`}>
        <span>Prepare my message</span>
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
          <Check className="h-[18px] w-[18px]" strokeWidth={2.4} />
        </span>
      </button>
      <p className={`mt-4 flex items-start gap-2 text-[12.5px] leading-snug ${C.muted}`}>
        <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Nothing is stored on this website. The form only prepares a message that you send yourself by {canWhatsApp && canEmail ? 'WhatsApp or email' : canWhatsApp ? 'WhatsApp' : 'email'}.
      </p>
    </form>
  );
}

export function Contact({ m }: { m: AlturaModel }) {
  const { contact } = m;
  const tel = telHref(m.phone);
  const mail = mailHref(m.email);
  const hours = text(contact, 'hours');
  const address = text(contact, 'address');
  const rows: { key: string; icon: ReactNode; label: string; value: string; href: string }[] = [
    { key: 'phone', icon: <Phone className="h-[18px] w-[18px]" strokeWidth={1.8} />, label: 'Phone', value: m.phone, href: tel },
    { key: 'email', icon: <Mail className="h-[18px] w-[18px]" strokeWidth={1.8} />, label: 'Email', value: m.email, href: mail },
    { key: 'hours', icon: <Clock className="h-[18px] w-[18px]" strokeWidth={1.8} />, label: 'Office hours', value: hours, href: '' },
    { key: 'address', icon: <MapPin className="h-[18px] w-[18px]" strokeWidth={1.8} />, label: 'Headquarters', value: address, href: '' },
  ].filter((row) => row.value);

  return (
    <TemplateSection sectionKey="contact" className={SECTION_PAD}>
      <div className={`${CONTAINER} grid gap-12 @5xl:grid-cols-12 @5xl:gap-10 @7xl:gap-16`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead layout="stack" eyebrow={text(contact, 'eyebrow')} title={text(contact, 'title')} subtitle={text(contact, 'subtitle')} />
          {rows.length > 0 && (
            <ul className="mt-10 divide-y divide-[#141612]/[0.1] border-y border-[#141612]/[0.1]">
              {rows.map((row) => (
                <li key={row.key} className="flex items-start gap-4 py-4">
                  <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F2EFE7] text-[#141612]">
                    {row.icon}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={`block text-[12.5px] font-semibold uppercase tracking-[0.12em] ${C.muted}`}>{row.label}</span>
                    {row.href ? (
                      <ActionLink action={{ kind: 'external', href: row.href }} className={`text-[16px] font-semibold ${C.ink} underline-offset-4 [overflow-wrap:anywhere] hover:underline`}>
                        {row.value}
                      </ActionLink>
                    ) : (
                      <span className={`block text-[15.5px] font-medium leading-snug ${C.ink}`}>{row.value}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {m.offices.length > 0 && (
            <div className="mt-10">
              <PillTag>Our offices</PillTag>
              <ul className="mt-5 grid gap-x-6 gap-y-6 @xl:grid-cols-2">
                {m.offices.map((office, i) => {
                  const officeTel = telHref(office.phone);
                  return (
                    <Reveal as="li" key={`${office.city}-${i}`} delay={stagger(i, 60)} className="min-w-0">
                      <p className={`${DISPLAY} text-[18px] font-semibold tracking-[-0.02em] ${C.ink}`}>
                        {office.city}
                        {office.label && <span className={`ml-2 align-middle text-[12px] font-semibold uppercase tracking-[0.1em] ${C.muted}`}>{office.label}</span>}
                      </p>
                      {office.address && <p className={`mt-1 text-[14px] leading-snug ${C.muted}`}>{office.address}</p>}
                      {office.phone &&
                        (officeTel ? (
                          <ActionLink action={{ kind: 'external', href: officeTel }} className={`mt-1 inline-flex min-h-8 items-center text-[14px] font-semibold ${C.ink} underline-offset-4 hover:underline`}>
                            {office.phone}
                          </ActionLink>
                        ) : (
                          <p className={`mt-1 text-[14px] ${C.ink}`}>{office.phone}</p>
                        ))}
                    </Reveal>
                  );
                })}
              </ul>
            </div>
          )}
          {m.map.embed && (
            <div className="mt-10">
              <MapEmbed embed={m.map.embed} title={`Map: ${m.companyName}`} className="aspect-[16/10] rounded-[24px] ring-1 ring-inset ring-[#141612]/[0.08]" />
              {m.map.link && (
                <ActionLink action={{ kind: 'external', href: m.map.link }} className={`mt-3 inline-flex min-h-10 items-center gap-1.5 text-[14px] font-semibold ${C.ink} underline decoration-current/30 underline-offset-4 hover:decoration-current`}>
                  <MapPin aria-hidden className="h-4 w-4" />
                  Open in Google Maps
                </ActionLink>
              )}
            </div>
          )}
        </div>
        <div className="min-w-0 @5xl:sticky @5xl:top-[calc(var(--tpl-sticky-top,0px)+112px)] @5xl:col-span-7 @5xl:self-start">
          <EnquiryCard m={m} />
        </div>
      </div>
    </TemplateSection>
  );
}
