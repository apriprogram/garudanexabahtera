// Hasil lab online (kunci `labresults`): SATU pita navy selebar layar (data-tpl-tone="inverse"). Kiri (kolom 1-5):
// label, H2, pengantar, tiga langkah bernomor mono dengan garis tegak, dan kotak catatan privasi (ikon gembok). Kanan
// (kolom 7-12): panel putih formulir permintaan hasil lab — No. registrasi, Tanggal lahir, Nama pasien, Kirim hasil
// lewat (WhatsApp / Email / Ambil di lab) — yang hanya MENYUSUN pesan WhatsApp (tanpa fetch, localStorage, atau
// <form action>; data tidak disimpan di website dan hasil lab tidak ditampilkan di website). Setelah lolos validasi:
// pesan apa adanya + "Buka WhatsApp" (tanpa nomor → email → salin). Tautan portal pasien (CMS) dibuka di tab baru
// tanpa membawa data formulir. HP: bertumpuk.
import { Check, CircleAlert, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, safeUrl, text, whatsappHref } from '../shared/utils';
import {
  CHANNELS,
  EMPTY_LAB,
  LAB_LIMITS,
  LAB_REQUIRED,
  labMessage,
  mailWith,
  pad2,
  todayIso,
  validateLab,
  type LabErrors,
  type LabForm,
  type SpxModel,
} from './model';
import { BTN, C, INPUT, MONO_LABEL, SECTION_PAD, TEXT_LINK, TYPE_S } from './styles';
import { SectionHead, TextLink } from './ui';

type Key = keyof LabForm;
const FALLBACK_NOTICE = 'Hasil lab tidak ditampilkan di website ini. Formulir hanya menyusun pesan WhatsApp; data tidak disimpan di website.';

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-medium ${C.ink}`}>
        {label}
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

function LabRequest({ m, notice }: { m: SpxModel; notice: string }) {
  const { labresults, contact } = m;
  const baseId = useId();
  const [form, setForm] = useState<LabForm>(EMPTY_LAB);
  const [errors, setErrors] = useState<LabErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const regRef = useRef<HTMLInputElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const title = text(labresults, 'form_title');
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(labresults, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const describe = (key: Key) => (errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {});
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateLab(form, todayIso());
    setErrors(found);
    const first = LAB_REQUIRED.find((key) => found[key]);
    if (first) {
      const target = first === 'reg' ? regRef : first === 'birth' ? birthRef : nameRef;
      target.current?.focus();
      return;
    }
    setCopied(false);
    setSent(labMessage(form, text(m.brand, 'company_name')));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = 'rounded-[8px] bg-white p-5 text-[#0D1B2A] @3xl:p-7';
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {notice}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? mailWith(text(contact, 'email'), 'Permintaan hasil lab', sent) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className={panel} aria-live="polite" data-spx-lab-result="">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${TYPE_S.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya. Pesan belum terkirim sebelum Anda menekan kirim di WhatsApp.</p>
        <pre className={`mt-5 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[6px] border p-4 font-mono text-[13px] leading-relaxed ${C.line} ${C.surface} ${C.ink} [overflow-wrap:anywhere]`}>
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
              window.setTimeout(() => regRef.current?.focus(), 0);
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

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={title ? `${baseId}-title` : undefined}
      aria-label={title ? undefined : 'Formulir permintaan hasil lab'}
      data-spx-lab-form=""
      className={panel}
    >
      {title && (
        <h3 id={`${baseId}-title`} className={`${TYPE_S.h3} ${C.ink}`}>
          {title}
        </h3>
      )}
      <div className={`grid gap-4 ${title ? 'mt-5' : ''}`}>
        <div className="grid gap-4 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2">
          <Field id={id('reg')} label="No. registrasi" error={errors.reg}>
            <input
              ref={regRef}
              id={id('reg')}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="mis. LAB-2610-0458"
              maxLength={LAB_LIMITS.reg}
              value={form.reg}
              onChange={(e) => set('reg')(e.target.value)}
              className={`${INPUT} font-mono uppercase placeholder:normal-case ${ring('reg')}`}
              {...describe('reg')}
            />
          </Field>
          <Field id={id('birth')} label="Tanggal lahir" error={errors.birth}>
            <input
              ref={birthRef}
              id={id('birth')}
              type="date"
              min="1900-01-01"
              max={todayIso()}
              autoComplete="bday"
              value={form.birth}
              onChange={(e) => set('birth')(e.target.value)}
              className={`${INPUT} ${ring('birth')}`}
              {...describe('birth')}
            />
          </Field>
        </div>
        <Field id={id('name')} label="Nama pasien" error={errors.name}>
          <input
            ref={nameRef}
            id={id('name')}
            type="text"
            autoComplete="name"
            maxLength={LAB_LIMITS.name}
            value={form.name}
            onChange={(e) => set('name')(e.target.value)}
            className={`${INPUT} ${ring('name')}`}
            {...describe('name')}
          />
        </Field>
        <fieldset className="min-w-0">
          <legend className={`mb-1.5 text-[14px] font-medium ${C.ink}`}>Kirim hasil lewat</legend>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map((channel) => (
              <label
                key={channel}
                className={`relative flex h-11 cursor-pointer items-center justify-center rounded-[6px] bg-white px-2 text-center text-[13.5px] font-medium leading-tight ring-1 ring-inset ring-[#0D1B2A]/50 transition-colors has-[:checked]:bg-(--spx-navy) has-[:checked]:text-white has-[:checked]:ring-(--spx-navy) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) ${C.ink}`}
              >
                <input
                  type="radio"
                  name={`${baseId}-channel`}
                  value={channel}
                  checked={form.channel === channel}
                  onChange={() => setForm((f) => ({ ...f, channel }))}
                  className="sr-only"
                />
                {channel}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-6 w-full`}>
        {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
        {button}
      </button>
      {privacy}
    </form>
  );
}

export function LabResults({ m }: { m: SpxModel }) {
  const { labresults } = m;
  const eyebrow = text(labresults, 'eyebrow');
  const steps = list(labresults, 'steps', 3).filter((s) => field(s, 'title'));
  const notice = text(labresults, 'notice') || FALLBACK_NOTICE;
  const portalHref = safeUrl(text(labresults, 'portal_url'));
  const portalLabel = text(labresults, 'portal_label') || 'Buka portal pasien';
  const portalText = text(labresults, 'portal_text');

  return (
    <TemplateSection sectionKey="labresults" data-tpl-tone="inverse" className={`bg-(--spx-navy) text-white ${SECTION_PAD}`}>
      <div className={`${CONTAINER} grid grid-cols-1 gap-y-10 @5xl:grid-cols-12 @5xl:gap-x-8 @7xl:gap-x-10`}>
        <div className="min-w-0 @5xl:col-span-5">
          <SectionHead
            layout="stack"
            tone="dark"
            eyebrow={eyebrow}
            code={m.code('labresults')}
            title={text(labresults, 'title')}
            subtitle={text(labresults, 'subtitle')}
            srTitle={eyebrow || 'Hasil lab'}
          />
          {steps.length > 0 && (
            <ol className="mt-9 grid gap-0">
              {steps.map((step, i) => (
                <Reveal as="li" key={`${field(step, 'title')}-${i}`} delay={stagger(i, 80)} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < steps.length - 1 && <span aria-hidden className="absolute bottom-0 left-[17px] top-10 w-px bg-white/20" />}
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] font-mono text-[13px] font-semibold text-(--spx-bright) ring-1 ring-inset ring-white/25"
                  >
                    {pad2(i + 1)}
                  </span>
                  <span className="min-w-0 pt-1.5">
                    <span className="block text-[16px] font-semibold leading-snug text-white">{field(step, 'title')}</span>
                    {field(step, 'text') && <span className="mt-1 block text-[14.5px] leading-relaxed text-white/75">{field(step, 'text')}</span>}
                  </span>
                </Reveal>
              ))}
            </ol>
          )}
          {portalHref && (
            <Reveal delay={240} className="mt-8 border-t border-white/15 pt-5">
              {portalText && <p className={`${MONO_LABEL} text-white/70`}>{portalText}</p>}
              <TextLink action={{ kind: 'external', href: portalHref }} label={portalLabel} tone="dark" className="mt-1" />
            </Reveal>
          )}
        </div>
        <Reveal delay={120} className="min-w-0 @5xl:col-span-6 @5xl:col-start-7 @5xl:self-start">
          <LabRequest m={m} notice={notice} />
        </Reveal>
      </div>
    </TemplateSection>
  );
}
