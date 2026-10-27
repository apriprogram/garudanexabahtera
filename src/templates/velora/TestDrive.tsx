// Test drive (`cta`): kartu gelap membulat di dalam gutter dengan foto latar (lapisan gelap), kiri label + judul putih +
// deskripsi + poin centang, kanan kartu putih berisi formulir test drive SENDIRI (berbahasa Inggris, bukan ContactForm
// bersama): nama, email, telepon, model (dari jajaran model), studio (dari daftar studio), tanggal, catatan. JUJUR:
// formulir hanya MENYUSUN pesan — tidak ada data yang dikirim ke server atau disimpan. Setelah lolos validasi, pesan
// tampil apa adanya dengan tombol "Send via WhatsApp" / "Send via email" (pratinjau CMS: tautan tidak dibuka). Tanpa
// WhatsApp & email → teks + tombol ke Dealer & kontak. SEMUA teks formulir (label, pilihan awal, pesan galat, catatan,
// teks setelah diisi, kalimat pesan) dari CMS lewat m.drive (model.ts driveCopy); tanggal di pesan memakai nama bulan CMS.
// Kartu model di jajaran model (`pick`) memilih model itu di formulir. Lapisan gelap foto: mendatar di layar lebar (teks
// di kiri), merata & lebih gelap di wadah sempit (teks selebar kartu); label kecil di atas foto berwarna putih.
import { Check, ChevronDown, CircleAlert, Lock, Mail, PencilLine, Phone } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { Reveal } from '../shared/Animated';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, hasImage, list, telHref, text, whatsappHref } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import {
  contactOffices,
  driveMessage,
  EMPTY_DRIVE,
  mailtoHref,
  todayIso,
  validateDrive,
  type DriveErrors,
  type DriveForm,
  type DrivePick,
  type VeloraModel,
} from './model';
import { VELORA_PHOTOS } from './photos';
import { C, DISPLAY, GUTTER, INPUT, INSET, TYPE_V } from './styles';
import { ArrowPill, SectionLabel } from './ui';

const BUTTON = 'inline-flex h-12 max-w-full items-center justify-center gap-2.5 rounded-full px-6 text-[15px] font-medium whitespace-nowrap transition-colors duration-300';

function Field({ id, label, error, optional = '', children }: { id: string; label: string; error?: string; optional?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-medium ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> ({optional})</span>}
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

const ORDER: (keyof DriveForm)[] = ['name', 'email', 'phone', 'model', 'date'];

function DriveFormCard({ m, pick }: { m: VeloraModel; pick: DrivePick | null }) {
  const copy = m.drive;
  const baseId = useId();
  const [form, setForm] = useState<DriveForm>(EMPTY_DRIVE);
  const [errors, setErrors] = useState<DriveErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<keyof DriveForm, HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>>>({});
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const models = m
    .items('lineup')
    .map((item) => field(item, 'name'))
    .filter(Boolean);
  const studios = contactOffices(m.contact)
    .map((item) => field(item, 'city'))
    .filter(Boolean);
  // Kartu model diklik → model itu terpilih (disesuaikan saat render, pola "state dari prop sebelumnya"; tanpa efek)
  const [seenPick, setSeenPick] = useState(pick);
  if (pick !== seenPick) {
    setSeenPick(pick);
    if (pick && models.includes(pick.name)) {
      setForm((f) => ({ ...f, model: pick.name }));
      setErrors((e) => ({ ...e, model: undefined }));
      setSent(null);
    }
  }
  const { title, labels } = copy;
  const wa = whatsappHref(m.driveWhatsapp) ? m.driveWhatsapp : '';
  const canMail = !!mailtoHref(m.driveEmail, 'x', 'x');
  const id = (key: keyof DriveForm) => `${baseId}-${key}`;
  const set = (key: keyof DriveForm) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: keyof DriveForm) => (errors[key] ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const) : {});
  const ring = (key: keyof DriveForm) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  const card = 'rounded-[24px] bg-white p-5 text-[#0D0E10] @3xl:p-7';

  if (!wa && !canMail) {
    return (
      <div className={card}>
        {title && <h3 className={`${C.ink} ${TYPE_V.h3}`}>{title}</h3>}
        {copy.fallbackText && <p className={`${title ? 'mt-2' : ''} ${TYPE_V.small} ${C.muted}`}>{copy.fallbackText}</p>}
        <ArrowPill action={m.contactAction} label={copy.fallbackButton} variant="ink" className="mt-5" />
      </div>
    );
  }

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateDrive(form, { models, today: todayIso(), messages: copy.errors });
    setErrors(found);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSent(driveMessage(m.companyName, form, copy, m.months));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  if (sent) {
    const waLink = wa ? whatsappHref(wa, sent) : '';
    const mail = mailtoHref(m.driveEmail, `${copy.subject}${form.model ? ` – ${form.model}` : ''}`, sent);
    return (
      <div className={card}>
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2 ${C.ink} ${TYPE_V.h3} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DCFCE7] text-[#15803D]">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          {copy.readyTitle}
        </h3>
        {copy.readyText && <p className={`mt-2 ${TYPE_V.small} ${C.muted}`}>{copy.readyText}</p>}
        <pre className={`mt-4 whitespace-pre-wrap rounded-[16px] bg-[#F4F4F2] p-4 font-sans text-[13.5px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>{sent}</pre>
        <div className="mt-5 flex flex-col gap-2.5 @xl:flex-row @xl:flex-wrap">
          {waLink && (
            <ActionLink action={{ kind: 'external', href: waLink }} className={`${BUTTON} bg-(--vl-fill) text-(--vl-on-fill) hover:bg-(--vl-fill-hover)`}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              {copy.sendWhatsapp}
            </ActionLink>
          )}
          {mail && (
            <ActionLink action={{ kind: 'external', href: mail }} className={`${BUTTON} bg-[#0D0E10] text-white hover:bg-[#25272C]`}>
              <Mail aria-hidden className="h-[18px] w-[18px] shrink-0" />
              {copy.sendEmail}
            </ActionLink>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              window.setTimeout(() => refs.current.name?.focus(), 0);
            }}
            className={`${BUTTON} bg-white text-[#0D0E10] ring-1 ring-inset ring-[#0D0E10]/[0.16] hover:bg-[#F4F4F2]`}
          >
            <PencilLine aria-hidden className="h-4 w-4" />
            {copy.edit}
          </button>
        </div>
      </div>
    );
  }

  const select = (key: 'model' | 'studio', label: string, placeholder: string, options: string[], optional = '') =>
    options.length > 0 && (
      <Field id={id(key)} label={label} error={errors[key]} optional={optional}>
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

  const input = (key: 'name' | 'email' | 'phone' | 'date', props: InputHTMLAttributes<HTMLInputElement>) => (
    <input
      ref={(el) => {
        refs.current[key] = el;
      }}
      id={id(key)}
      value={form[key]}
      onChange={(e) => set(key)(e.target.value)}
      className={`${INPUT} h-12 ${ring(key)}`}
      {...props}
      {...invalid(key)}
    />
  );

  return (
    <form noValidate onSubmit={onSubmit} aria-labelledby={title ? `${baseId}-title` : undefined} aria-label={title ? undefined : copy.button} className={card}>
      {title && (
        <h3 id={`${baseId}-title`} className={`${C.ink} ${TYPE_V.h3}`}>
          {title}
        </h3>
      )}
      <div className={`${title ? 'mt-5' : ''} grid gap-4`}>
        <Field id={id('name')} label={labels.name} error={errors.name}>
          {input('name', { type: 'text', autoComplete: 'name', maxLength: 80 })}
        </Field>
        <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @7xl:grid-cols-2">
          <Field id={id('email')} label={labels.email} error={errors.email}>
            {input('email', { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 120 })}
          </Field>
          <Field id={id('phone')} label={labels.phone} error={errors.phone} optional={copy.optional}>
            {input('phone', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 24 })}
          </Field>
        </div>
        <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @7xl:grid-cols-2">
          {select('model', labels.model, copy.modelPrompt, models)}
          {select('studio', labels.studio, copy.studioPrompt, studios, copy.optional)}
        </div>
        <Field id={id('date')} label={labels.date} error={errors.date} optional={copy.optional}>
          {input('date', { type: 'date', min: todayIso() })}
        </Field>
        <Field id={id('note')} label={labels.note} optional={copy.optional}>
          <textarea
            ref={(el) => {
              refs.current.note = el;
            }}
            id={id('note')}
            rows={3}
            maxLength={400}
            value={form.note}
            onChange={(e) => set('note')(e.target.value)}
            className={`${INPUT} min-h-24 py-3`}
          />
        </Field>
      </div>
      <button type="submit" className={`${BUTTON} mt-6 w-full bg-(--vl-fill) text-(--vl-on-fill) hover:bg-(--vl-fill-hover)`}>
        {copy.button}
      </button>
      {copy.note && (
        <p className={`mt-3 flex items-start gap-2 text-[12.5px] leading-snug ${C.muted}`}>
          <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {copy.note}
        </p>
      )}
    </form>
  );
}

export function TestDrive({ m, pick = null }: { m: VeloraModel; pick?: DrivePick | null }) {
  const { cta } = m;
  const image = text(cta, 'image');
  const eyebrow = text(cta, 'eyebrow');
  const title = text(cta, 'title');
  const subtitle = text(cta, 'subtitle');
  const points = list(cta, 'points', 4).filter((item) => field(item, 'text'));
  const phone = text(m.contact, 'phone');
  const tel = telHref(phone);
  return (
    <TemplateSection sectionKey="cta" className="py-2 @3xl:py-3">
      <div className={GUTTER}>
        <div className="relative isolate overflow-hidden rounded-[24px] bg-[#1B1D21] @5xl:rounded-[28px]">
          {hasImage(image) && (
            <>
              <KitPhoto
                src={image}
                alt={VELORA_PHOTOS.alt(image, title || m.companyName)}
                sizes="100vw"
                fallback="none"
                parallax={4}
                className="absolute inset-0 -z-20"
              />
              <span aria-hidden className="vl-cta-scrim absolute inset-0 -z-10" />
            </>
          )}
          <div className={`grid items-start gap-10 py-14 @3xl:py-20 @5xl:grid-cols-12 @5xl:gap-12 @5xl:py-24 ${INSET}`}>
            <div data-tpl-tone="inverse" className="flex min-w-0 flex-col self-stretch text-white @5xl:col-span-6 @7xl:col-span-7">
              {eyebrow && (
                <Reveal variant="fade">
                  <SectionLabel label={eyebrow} tone={hasImage(image) ? 'photo' : 'dark'} />
                </Reveal>
              )}
              {title && (
                <Reveal as="h2" delay={80} className={`${eyebrow ? 'mt-5' : ''} max-w-[16ch] text-balance text-white ${DISPLAY} text-[34px] font-medium leading-[1.04] tracking-[-0.035em] @3xl:text-[48px] @5xl:text-[60px] @min-[96rem]:text-[72px]`}>
                  {title}
                </Reveal>
              )}
              {subtitle && (
                <Reveal as="p" delay={160} className={`mt-5 max-w-[50ch] text-pretty ${TYPE_V.lead} text-white/80`}>
                  {subtitle}
                </Reveal>
              )}
              {points.length > 0 && (
                <ul className="mt-8 grid gap-3">
                  {points.map((item, i) => (
                    <Reveal as="li" key={`${field(item, 'text')}-${i}`} delay={stagger(i + 2, 70)} className="flex items-start gap-3 text-[15px] text-white">
                      <span aria-hidden className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-(--vl-red) text-(--vl-on-red)">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                      {field(item, 'text')}
                    </Reveal>
                  ))}
                </ul>
              )}
              {(tel || m.waAction) && (
                <Reveal delay={240} className="mt-10 border-t border-white/15 pt-6 @5xl:mt-auto">
                  {m.drive.talk && <p className="mb-2 text-[13px] font-medium text-white/85">{m.drive.talk}</p>}
                  <p className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white">
                    {tel && (
                      <ActionLink action={{ kind: 'external', href: tel }} className="inline-flex min-h-10 items-center gap-2 font-medium underline decoration-white/30 underline-offset-4 hover:decoration-white">
                        <Phone aria-hidden className="h-4 w-4 shrink-0" />
                        {phone}
                      </ActionLink>
                    )}
                    {m.waAction && (
                      <ActionLink action={m.waAction} className="inline-flex min-h-10 items-center gap-2 font-medium underline decoration-white/30 underline-offset-4 hover:decoration-white">
                        <WhatsAppIcon className="h-4 w-4 shrink-0" />
                        {m.whatsappLabel}
                      </ActionLink>
                    )}
                  </p>
                </Reveal>
              )}
            </div>
            <Reveal delay={120} className="min-w-0 @5xl:col-span-6 @7xl:col-span-5">
              <DriveFormCard m={m} pick={pick} />
            </Reveal>
          </div>
        </div>
      </div>
    </TemplateSection>
  );
}
