// Cari lawan main Sparring Padel (section `matchmaking`, latar putih). Kiri (5/12): label, H2, pengantar, dan tiga
// langkah bernomor. Kanan (7/12): kartu formulir putih bercincin tipis: tangga LEVEL 1–7 (radio berbentuk ubin Saira;
// terpilih = neon; saat section masuk layar ubin menyala berurutan SEKALI), penjelasan level terpilih (wilayah live),
// Nama, Hari, Jam → menyusun pesan WhatsApp ke admin. JUJUR: tanpa fetch/localStorage/<form action>; data tidak
// disimpan di website. Hasil: pesan apa adanya + "Buka WhatsApp" (tanpa nomor: email / salin) + "Ubah data".
import { Check, ChevronDown, CircleAlert, Copy, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { stagger } from '../shared/motion';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, text, whatsappHref } from '../shared/utils';
import {
  EMPTY_MATCH,
  MATCH_DAYS,
  MATCH_REQUIRED,
  MATCH_TIMES,
  levelsOf,
  mailWith,
  matchMessage,
  pad2,
  validateMatch,
  type MatchErrors,
  type MatchForm,
  type SparringModel,
} from './model';
import { BTN, C, CARD, DISPLAY, ERROR, GRID_GAP, INPUT, MONO_LABEL, SECTION_PAD, TEXT_LINK, TYPE } from './styles';
import { SectionHead } from './ui';

type Key = keyof MatchForm;

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-medium ${C.ink}`}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className={`mt-1.5 flex items-start gap-1.5 text-[13px] font-medium ${ERROR.light}`}>
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function MatchFormCard({ m }: { m: SparringModel }) {
  const s = m.matchmaking;
  const baseId = useId();
  const levels = levelsOf(s);
  const [form, setForm] = useState<MatchForm>(EMPTY_MATCH);
  const [errors, setErrors] = useState<MatchErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const levelRef = useRef<HTMLInputElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);

  const title = text(s, 'form_title');
  const note = text(s, 'form_text') || 'Formulir ini hanya menyusun pesan WhatsApp untuk admin; data tidak disimpan di website.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const button = hasWhatsapp ? text(s, 'form_button') || 'Kirim ke WhatsApp' : 'Susun pesan';
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const selected = levels.find((l) => l.level === form.level);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateMatch(
      form,
      levels.map((l) => l.level),
    );
    setErrors(found);
    const first = MATCH_REQUIRED.find((key) => found[key]);
    if (first === 'level') {
      levelRef.current?.focus();
      return;
    }
    if (first === 'name') {
      nameRef.current?.focus();
      return;
    }
    setCopied(false);
    setSent(matchMessage(form, levels, m.companyName));
    window.setTimeout(() => resultHeading.current?.focus(), 0);
  };

  const panel = `${CARD.light} p-5 @3xl:p-7 @5xl:p-8`;
  const privacy = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {note}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? mailWith(text(m.contact, 'email'), 'Cari lawan main padel', sent) : '';
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(sent);
        setCopied(true);
      } catch {
        setCopied(false);
      }
    };
    return (
      <div className={panel} aria-live="polite" data-sp-match="sent">
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-2.5 ${TYPE.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-2 text-[14px] leading-snug ${C.muted}`}>Periksa isinya. Pesan belum terkirim sebelum Anda menekan kirim di WhatsApp.</p>
        <pre className={`mt-5 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-[12px] ${C.band} p-4 font-mono text-[13px] leading-relaxed ${C.ink} [overflow-wrap:anywhere]`}>
          {sent}
        </pre>
        <div className="mt-6 flex flex-col items-stretch gap-1 @xl:flex-row @xl:items-center @xl:gap-6">
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
              window.setTimeout(() => nameRef.current?.focus(), 0);
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

  const select = (key: 'day' | 'time', options: readonly string[]) => (
    <div className="relative">
      <select id={id(key)} value={form[key]} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} h-12 appearance-none pr-10`}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${C.muted}`} />
    </div>
  );

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby={title ? `${baseId}-title` : undefined}
      aria-label={title ? undefined : 'Formulir cari lawan main'}
      className={panel}
      data-sp-match="form"
    >
      {title && (
        <h3 id={`${baseId}-title`} className={`${TYPE.h3} ${C.ink}`}>
          {title}
        </h3>
      )}
      <fieldset className={`min-w-0 ${title ? 'mt-6' : ''}`} {...(errors.level ? { 'aria-describedby': `${id('level')}-error` } : {})}>
        <legend className={`mb-2 text-[14px] font-medium ${C.ink}`}>Level Anda</legend>
        <Reveal variant="fade" className="sp-levels grid grid-cols-7 gap-1.5 @3xl:gap-2">
          {levels.map((level, i) => (
            <label
              key={`${level.level}-${i}`}
              style={{ '--sp-i': i } as CSSProperties}
              className={`sp-level relative flex h-12 cursor-pointer items-center justify-center rounded-[10px] ring-1 ring-inset ring-[#0A1622]/25 transition-colors hover:bg-[#0A1622]/[0.04] has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--sp-ink) @3xl:h-14 ${
                errors.level ? ERROR.ringLight : ''
              } ${C.ink}`}
            >
              <input
                ref={i === 0 ? levelRef : undefined}
                type="radio"
                name={`${baseId}-level`}
                value={level.level}
                checked={form.level === level.level}
                onChange={() => set('level')(level.level)}
                aria-label={`Level ${level.level}: ${level.name}`}
                className="sr-only"
              />
              <span aria-hidden className={`${DISPLAY} text-[20px] font-bold italic tabular-nums @3xl:text-[22px]`}>
                {level.level}
              </span>
            </label>
          ))}
        </Reveal>
        <p aria-live="polite" className={`mt-3 min-h-[44px] text-[14px] leading-snug ${C.muted}`}>
          {selected ? (
            <>
              <span className={`font-semibold ${C.ink}`}>{selected.name}</span>
              {selected.text && ` — ${selected.text}`}
            </>
          ) : (
            'Pilih angka 1–7: 1 pemula, 7 rutin bertanding.'
          )}
        </p>
        {errors.level && (
          <p id={`${id('level')}-error`} className={`mt-1 flex items-start gap-1.5 text-[13px] font-medium ${ERROR.light}`}>
            <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
            {errors.level}
          </p>
        )}
      </fieldset>
      <div className="mt-4 grid gap-4">
        <Field id={id('name')} label="Nama" error={errors.name}>
          <input
            ref={nameRef}
            type="text"
            id={id('name')}
            value={form.name}
            maxLength={60}
            autoComplete="name"
            onChange={(e) => set('name')(e.target.value)}
            {...(errors.name ? { 'aria-invalid': true, 'aria-describedby': `${id('name')}-error` } : {})}
            className={`${INPUT} h-12 ${errors.name ? ERROR.ringLight : ''}`}
          />
        </Field>
        <div className="grid gap-4 @xl:grid-cols-2">
          <Field id={id('day')} label="Hari">
            {select('day', MATCH_DAYS)}
          </Field>
          <Field id={id('time')} label="Jam">
            {select('time', MATCH_TIMES)}
          </Field>
        </div>
      </div>
      <button type="submit" className={`${BTN.neon} ${BTN.md} mt-7 w-full`}>
        {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
        {button}
      </button>
      {privacy}
    </form>
  );
}

export function Matchmaking({ m }: { m: SparringModel }) {
  const s = m.matchmaking;
  const steps = list(s, 'steps', 3).filter((step) => field(step, 'title'));
  return (
    <TemplateSection sectionKey="matchmaking" className={`bg-white ${SECTION_PAD}`}>
      <div className={CONTAINER}>
        <div className={`grid gap-y-10 @5xl:grid-cols-12 ${GRID_GAP}`}>
          <div className="min-w-0 @5xl:col-span-5 @5xl:pt-2">
            <SectionHead eyebrow={text(s, 'eyebrow')} title={text(s, 'title')} subtitle={text(s, 'subtitle')} srTitle="Cari lawan main" />
            {steps.length > 0 && (
              <ol className="mt-8 grid gap-3 @3xl:mt-10">
                {steps.map((step, i) => (
                  <Reveal as="li" key={`${field(step, 'title')}-${i}`} delay={stagger(i)} className="flex items-center gap-4">
                    <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--sp-night) ${MONO_LABEL} text-[12px] text-(--sp-neon)`}>
                      {pad2(i + 1)}
                    </span>
                    <span className={`${DISPLAY} text-[18px] font-semibold leading-snug ${C.ink}`}>{field(step, 'title')}</span>
                  </Reveal>
                ))}
              </ol>
            )}
          </div>
          <Reveal delay={120} className="min-w-0 @5xl:col-span-7">
            <MatchFormCard m={m} />
          </Reveal>
        </div>
      </div>
    </TemplateSection>
  );
}
