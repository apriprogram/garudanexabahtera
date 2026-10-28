// Pendaftaran online (kunci `registration`), latar putih. Layar lebar: kiri (kolom 1-5) kepala section + kartu "Siapkan
// sebelum datang" (foto meja pendaftaran opsional + daftar centang); kanan (kolom 7-12) formulir 3 LANGKAH di panel
// kertas: penanda langkah (aria-current="step"), Langkah 1 poli & dokter, Langkah 2 data pasien (nama, tanggal lahir,
// nomor HP, jenis pasien BPJS/Umum/Asuransi), Langkah 3 jadwal kunjungan (tanggal, sesi, keluhan). HP: kepala → formulir
// → kartu persiapan (tanpa foto di HP). Catatan darurat merah di atas formulir ("jangan daftar online, langsung ke IGD / 119").
// JUJUR: formulir hanya MENYUSUN pesan — tidak ada fetch, localStorage, atau <form action>; data pasien tidak disimpan di
// website. Setelah valid, pesan ditampilkan apa adanya dengan "Buka WhatsApp" (tanpa nomor: email; tanpa keduanya:
// "Salin pesan"). Tombol "Daftar" di jadwal dokter mengisi poli & dokter lewat RegistrationPickContext.
import { Check, ChevronDown, CircleAlert, Copy, Lock, PencilLine, Phone, Siren } from 'lucide-react';
import { useContext, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Reveal } from '../shared/Animated';
import { WhatsAppIcon } from '../shared/icons';
import { CONTAINER } from '../shared/layout';
import { ActionLink, TemplateSection } from '../shared/Shell';
import { field, list, text, whatsappHref } from '../shared/utils';
import { KitPhoto } from '../kit/Photo';
import { RegistrationPickContext } from './hooks';
import {
  EMPTY_REGISTRATION,
  PAYERS,
  REG_LIMITS,
  SESSIONS,
  STEP_FIELDS,
  STEP_TITLES,
  clinicItems,
  displayPhone,
  doctorsForPoli,
  firstInvalidStep,
  registrationMailHref,
  registrationMessage,
  todayIso,
  uniquePolis,
  validateStep,
  type MedicareModel,
  type RegistrationErrors,
  type RegistrationForm,
} from './model';
import { MEDICARE_PHOTOS } from './photos';
import { BTN, C, CARD, GRID_GAP, INPUT, SECTION_PAD, T, TEXT_LINK } from './styles';
import { CheckList, SectionHead } from './ui';

type Key = keyof RegistrationForm;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function Field({ id, label, error, optional = false, hint, className = '', children }: { id: string; label: string; error?: string; optional?: boolean; hint?: string; className?: string; children: ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-2 block font-semibold ${T.body} ${C.ink}`}>
        {label}
        {optional && <span className={`font-normal ${C.muted}`}> (opsional)</span>}
      </label>
      {children}
      {hint && !error && <p className={`mt-2 ${T.small} ${C.muted}`}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className={`mt-2 flex items-start gap-2 font-semibold text-[#B42318] ${T.small}`}>
          <CircleAlert aria-hidden className="mt-[0.15em] h-5 w-5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Pilihan bulat (radio) bergaya tombol: BPJS/Umum/Asuransi, Pagi/Siang/Sore. */
function Choices({
  name,
  legend,
  options,
  value,
  onChange,
  error,
  errorId,
  refFirst,
}: {
  name: string;
  legend: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  error?: string;
  errorId: string;
  refFirst: (el: HTMLInputElement | null) => void;
}) {
  return (
    <fieldset className="min-w-0" aria-describedby={error ? errorId : undefined}>
      <legend className={`mb-2 font-semibold ${T.body} ${C.ink}`}>{legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option, i) => (
          <label
            key={option}
            className={`relative flex min-h-[52px] cursor-pointer items-center justify-center rounded-[10px] bg-white px-2 text-center font-semibold ring-1 ring-inset transition-colors has-[:checked]:bg-(--tpl-accent) has-[:checked]:text-(--tpl-on-accent) has-[:checked]:ring-(--tpl-accent) has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) ${T.body} ${
              error ? 'ring-2 ring-[#B42318]' : 'ring-[#0E1B2E]/50'
            } ${C.ink}`}
          >
            <input
              ref={i === 0 ? refFirst : undefined}
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {option}
          </label>
        ))}
      </div>
      {error && (
        <p id={errorId} className={`mt-2 flex items-start gap-2 font-semibold text-[#B42318] ${T.small}`}>
          <CircleAlert aria-hidden className="mt-[0.15em] h-5 w-5 shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
}

function RegistrationFormPanel({ m }: { m: MedicareModel }) {
  const { registration } = m;
  const baseId = useId();
  const doctors = m.items('doctors');
  const clinicNames = clinicItems(m.clinics).map((item) => field(item, 'name'));
  const polis = uniquePolis(clinicNames.length > 0 ? clinicNames : doctors.map((doc) => field(doc, 'poli')));
  const [form, setForm] = useState<RegistrationForm>(EMPTY_REGISTRATION);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refs = useRef<Partial<Record<Key, Control | null>>>({});
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const { pick } = useContext(RegistrationPickContext);
  const today = todayIso();
  const ctx = { polis, doctors, today };

  // Tombol "Daftar" di jadwal dokter: isi poli & dokter, kembali ke langkah 1, fokus ke judul langkah
  useEffect(() => {
    if (!pick) return;
    setForm((f) => ({ ...f, poli: pick.poli, doctor: pick.doctor }));
    setErrors({});
    setSent(null);
    setStep(0);
    const timer = window.setTimeout(() => stepHeading.current?.focus({ preventScroll: true }), 350);
    return () => window.clearTimeout(timer);
  }, [pick]);

  const formNote = text(registration, 'form_note') || 'Formulir ini hanya menyusun pesan WhatsApp untuk petugas pendaftaran; data pasien tidak disimpan di website.';
  const hasWhatsapp = !!whatsappHref(m.whatsapp);
  const submitLabel = hasWhatsapp ? text(registration, 'form_button') || 'Susun pesan WhatsApp' : 'Susun pesan';
  const id = (key: Key) => `${baseId}-${key}`;
  const set = (key: Key) => (value: string) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Poli berganti → dokter yang tidak praktik di poli itu dilepas
      if (key === 'poli' && f.doctor && !doctorsForPoli(doctors, value).some((doc) => field(doc, 'name') === f.doctor)) next.doctor = '';
      return next;
    });
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const bind = (key: Key) => ({
    id: id(key),
    ref: (el: Control | null) => {
      refs.current[key] = el;
    },
    value: form[key],
    ...(errors[key] ? { 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } : {}),
  });
  const ring = (key: Key) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  const focusLater = (fn: () => void) => window.setTimeout(fn, 0);

  /** Periksa langkah ini; galat → fokus ke isian pertama yang salah. true bila valid. */
  const checkStep = (current: number): boolean => {
    const found = validateStep(current, form, ctx);
    setErrors(found);
    const first = STEP_FIELDS[current].find((key) => found[key]);
    if (first) {
      focusLater(() => refs.current[first]?.focus());
      return false;
    }
    return true;
  };

  const goTo = (next: number) => {
    setStep(next);
    focusLater(() => stepHeading.current?.focus());
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step < STEP_FIELDS.length - 1) {
      if (checkStep(step)) goTo(step + 1);
      return;
    }
    const invalid = firstInvalidStep(form, ctx);
    if (invalid >= 0) {
      setStep(invalid);
      checkStep(invalid);
      return;
    }
    setCopied(false);
    setSent(registrationMessage(form, text(m.brand, 'company_name')));
    focusLater(() => resultHeading.current?.focus());
  };

  const panel = `flex w-full flex-col rounded-[12px] p-5 @3xl:p-8 ${C.paper} ring-1 ring-inset ring-[#0E1B2E]/[0.08]`;
  const privacy = (
    <p className={`mt-5 flex items-start gap-2.5 ${T.small} ${C.muted}`}>
      <Lock aria-hidden className="mt-[0.2em] h-4 w-4 shrink-0" />
      {formNote}
    </p>
  );

  if (sent) {
    const wa = hasWhatsapp ? m.waWith(sent) : null;
    const mail = !wa ? registrationMailHref(text(m.contact, 'email'), sent) : '';
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
        <h3 ref={resultHeading} tabIndex={-1} className={`flex items-center gap-3 ${T.h3} ${C.ink} focus:outline-none`}>
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </span>
          Pesan siap dikirim
        </h3>
        <p className={`mt-3 ${T.body} ${C.muted}`}>Periksa isinya, lalu kirim ke petugas pendaftaran. Pesan belum terkirim sebelum Anda menekan kirim di WhatsApp.</p>
        <pre className={`mt-5 max-h-[460px] overflow-auto whitespace-pre-wrap rounded-[10px] bg-white p-4 font-sans ring-1 ring-inset ring-[#0E1B2E]/[0.12] ${T.body} ${C.ink} [overflow-wrap:anywhere]`}>
          {sent}
        </pre>
        <div className="mt-6 flex flex-col items-stretch gap-2 @xl:flex-row @xl:items-center @xl:gap-6">
          {wa ? (
            <ActionLink action={wa} className={BTN.primary}>
              <WhatsAppIcon className="h-5 w-5 shrink-0" />
              Buka WhatsApp
            </ActionLink>
          ) : mail ? (
            <ActionLink action={{ kind: 'external', href: mail }} className={BTN.primary}>
              Kirim lewat email
            </ActionLink>
          ) : (
            <button type="button" onClick={copy} className={BTN.primary}>
              {copied ? <Check aria-hidden className="h-5 w-5" /> : <Copy aria-hidden className="h-5 w-5" />}
              {copied ? 'Tersalin' : 'Salin pesan'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSent(null);
              setStep(0);
              focusLater(() => stepHeading.current?.focus());
            }}
            className={`${TEXT_LINK} self-center`}
          >
            <PencilLine aria-hidden className="h-5 w-5" />
            Ubah data
          </button>
        </div>
        {privacy}
      </div>
    );
  }

  const select = (key: 'poli' | 'doctor', options: { value: string; label: string }[], placeholder: string, extra: { autoComplete?: string } = {}) => (
    <div className="relative">
      <select {...bind(key)} {...extra} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} appearance-none pr-12 ${ring(key)}`}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={`pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 ${C.muted}`} />
    </div>
  );
  const input = (key: Key, extra: Record<string, string> = {}) => (
    <input type="text" {...bind(key)} maxLength={REG_LIMITS[key]} {...extra} onChange={(e) => set(key)(e.target.value)} className={`${INPUT} ${ring(key)}`} />
  );

  const poliDoctors = doctorsForPoli(doctors, form.poli);
  const chosen = poliDoctors.find((doc) => field(doc, 'name') === form.doctor);
  const chosenHint = chosen ? [field(chosen, 'days'), field(chosen, 'hours')].filter(Boolean).join(' · ') : '';
  const last = step === STEP_FIELDS.length - 1;

  return (
    <form noValidate onSubmit={onSubmit} aria-label="Formulir pendaftaran berobat" className={panel}>
      <ol aria-label="Langkah pendaftaran" className="grid grid-cols-3 gap-2">
        {STEP_TITLES.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo';
          return (
            <li key={label} aria-current={state === 'current' ? 'step' : undefined} className="flex min-w-0 flex-col gap-2 @xl:flex-row @xl:items-center">
              <span
                aria-hidden
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] font-bold ${
                  state === 'todo' ? 'bg-white text-[#46566B] ring-1 ring-inset ring-[#0E1B2E]/25' : 'bg-(--tpl-accent) text-(--tpl-on-accent)'
                }`}
              >
                {state === 'done' ? <Check className="h-5 w-5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span className={`min-w-0 leading-snug ${T.small} ${state === 'todo' ? C.muted : `font-semibold ${C.ink}`}`}>
                {label}
                {state === 'done' && <span className="sr-only"> (selesai)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      <div aria-hidden className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#0E1B2E]/[0.08]">
        <div className="h-full rounded-full bg-(--tpl-accent) transition-[width] duration-300" style={{ width: `${((step + 1) / STEP_FIELDS.length) * 100}%` }} />
      </div>

      <h3 ref={stepHeading} tabIndex={-1} className={`mt-7 ${T.h3} ${C.ink} focus:outline-none`}>
        <span className={`block ${T.small} font-semibold text-(--tpl-accent-ink)`}>
          Langkah {step + 1} dari {STEP_FIELDS.length}
        </span>
        {STEP_TITLES[step]}
      </h3>

      <div className="mt-5 grid gap-5">
        {step === 0 && (
          <>
            <Field id={id('poli')} label="Poli tujuan" error={errors.poli}>
              {select(
                'poli',
                polis.map((p) => ({ value: p, label: p })),
                'Pilih poli',
              )}
            </Field>
            <Field id={id('doctor')} label="Dokter" optional error={errors.doctor} hint={chosenHint ? `Praktik: ${chosenHint}` : undefined}>
              {select(
                'doctor',
                poliDoctors.map((doc) => ({ value: field(doc, 'name'), label: field(doc, 'name') })),
                form.poli ? 'Dokter mana saja' : 'Pilih poli dulu',
              )}
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <Field id={id('name')} label="Nama pasien" error={errors.name}>
              {input('name', { autoComplete: 'name' })}
            </Field>
            <div className="grid gap-5 @xl:grid-cols-2 @5xl:grid-cols-1 @6xl:grid-cols-2">
              <Field id={id('birth')} label="Tanggal lahir" error={errors.birth}>
                {input('birth', { type: 'date', max: today, autoComplete: 'bday' })}
              </Field>
              <Field id={id('phone')} label="Nomor HP / WhatsApp" error={errors.phone}>
                {input('phone', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: 'mis. 0812 3456 7890' })}
              </Field>
            </div>
            <Choices
              name={`${baseId}-payer`}
              legend="Jenis pasien"
              options={PAYERS}
              value={form.payer}
              onChange={set('payer')}
              error={errors.payer}
              errorId={`${id('payer')}-error`}
              refFirst={(el) => {
                refs.current.payer = el;
              }}
            />
            {form.payer === 'Asuransi' && (
              <Field id={id('insurer')} label="Nama asuransi / perusahaan" optional>
                {input('insurer')}
              </Field>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <Field id={id('date')} label="Tanggal kunjungan" error={errors.date}>
              {input('date', { type: 'date', min: today })}
            </Field>
            <Choices
              name={`${baseId}-session`}
              legend="Sesi kunjungan"
              options={SESSIONS}
              value={form.session}
              onChange={set('session')}
              error={errors.session}
              errorId={`${id('session')}-error`}
              refFirst={(el) => {
                refs.current.session = el;
              }}
            />
            <Field id={id('complaint')} label="Keluhan singkat" optional>
              <textarea
                {...bind('complaint')}
                maxLength={REG_LIMITS.complaint}
                rows={3}
                onChange={(e) => set('complaint')(e.target.value)}
                className={`${INPUT} min-h-28 py-3`}
              />
            </Field>
          </>
        )}
      </div>

      <div className="mt-auto flex flex-col-reverse gap-3 pt-7 @xl:flex-row @xl:items-center @xl:justify-between">
        {step > 0 ? (
          <button type="button" onClick={() => goTo(step - 1)} className={`${BTN.outline} w-full @xl:w-auto`}>
            Kembali
          </button>
        ) : (
          <span aria-hidden className="hidden @xl:block" />
        )}
        {last ? (
          <button type="submit" className={`${BTN.primary} w-full @xl:w-auto`}>
            {hasWhatsapp && <WhatsAppIcon className="h-5 w-5 shrink-0" />}
            {submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (checkStep(step)) goTo(step + 1);
            }}
            className={`${BTN.primary} w-full @xl:w-auto`}
          >
            Lanjut
          </button>
        )}
      </div>
      {privacy}
    </form>
  );
}

export function Registration({ m }: { m: MedicareModel }) {
  const { registration } = m;
  const prepare = list(registration, 'prepare', 6)
    .map((item) => field(item, 'item'))
    .filter(Boolean);
  const prepareTitle = text(registration, 'prepare_title');
  const image = text(registration, 'image');
  const note = text(registration, 'emergency_note');
  const igdNumber = displayPhone(m.igdPhone);
  const hasPrepare = prepare.length > 0 || !!prepareTitle;

  return (
    <TemplateSection sectionKey="registration" className={SECTION_PAD}>
      {/* HP: kepala → formulir → kartu persiapan (urutan DOM). Layar lebar: kepala & persiapan di kolom kiri, formulir
          membentang dua baris di kanan. */}
      <div className={`${CONTAINER} grid grid-cols-1 @5xl:grid-cols-12 @5xl:grid-rows-[auto_1fr] ${GRID_GAP}`}>
        <div className="min-w-0 @5xl:col-span-5 @5xl:row-start-1">
          <SectionHead stack eyebrow={text(registration, 'eyebrow')} title={text(registration, 'title')} subtitle={text(registration, 'subtitle')} srTitle="Pendaftaran online" />
        </div>
        <div className="mt-10 min-w-0 @5xl:col-span-7 @5xl:col-start-6 @5xl:row-span-2 @5xl:row-start-1 @5xl:mt-0 @5xl:flex @5xl:flex-col @6xl:col-span-6 @6xl:col-start-7">
          {(note || m.igdAction) && (
            <Reveal
              variant="fade"
              className={`mb-5 flex items-start gap-3 rounded-[12px] border-l-4 border-[#B71C1C] p-4 ${C.redTint} ${C.red}`}
            >
              <Siren aria-hidden className="mt-[0.15em] h-6 w-6 shrink-0" />
              <div className="min-w-0">
                {note && <p className={`font-semibold ${T.body}`}>{note}</p>}
                {m.igdAction && (
                  <ActionLink
                    action={m.igdAction}
                    className={`-mb-2 inline-flex min-h-12 items-center gap-2 font-bold underline decoration-2 underline-offset-4 ${T.body}`}
                  >
                    <Phone aria-hidden className="h-5 w-5 shrink-0" />
                    <span>
                      Telepon IGD <span className="whitespace-nowrap tabular-nums">{igdNumber}</span>
                    </span>
                  </ActionLink>
                )}
              </div>
            </Reveal>
          )}
          <Reveal delay={80} className="@5xl:flex @5xl:flex-1">
            <RegistrationFormPanel m={m} />
          </Reveal>
        </div>
        {hasPrepare && (
          <Reveal delay={120} className="mt-8 min-w-0 self-start @5xl:col-span-5 @5xl:row-start-2 @5xl:mt-10">
            <PrepareCard title={prepareTitle} items={prepare} image={image} />
          </Reveal>
        )}
      </div>
    </TemplateSection>
  );
}

/** Kartu "Siapkan sebelum datang": foto opsional (3:2) + daftar centang. */
function PrepareCard({ title, items, image }: { title: string; items: string[]; image: string }) {
  return (
    <div className={`overflow-hidden ${CARD}`}>
      <KitPhoto
        src={image}
        alt={MEDICARE_PHOTOS.alt(image, title || 'Meja pendaftaran pasien rumah sakit')}
        fallback="none"
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="hidden aspect-[16/9] @3xl:block @5xl:aspect-[2/1]"
      />
      <div className="p-5 @3xl:p-7">
        {title && <h3 className={`${T.h3} ${C.ink}`}>{title}</h3>}
        <CheckList items={items} label={title || 'Yang perlu disiapkan'} className={title ? 'mt-4' : ''} />
      </div>
    </div>
  );
}
