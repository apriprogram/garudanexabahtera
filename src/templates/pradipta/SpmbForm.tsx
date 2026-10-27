// Formulir tanya SPMB tiga langkah (Data siswa → Pilihan → Kontak) di kartu biru langit (putih bila pita SPMB berwarna
// langit, karena pita berselang-seling menurut section yang tampil). Formulir ini untuk BERTANYA,
// bukan pendaftaran: langkah terakhir menyusun pesan WhatsApp untuk panitia (./model spmbMessage). Tidak ada fetch,
// tidak ada localStorage, tidak ada unggah berkas atau pembayaran: isian hanya ada di memori halaman. Validasi per
// langkah; galat ditulis di bawah isian (aria-invalid + aria-describedby) dan fokus pindah ke isian bergalat pertama.
// Lanjut/Kembali memindahkan fokus ke judul langkah; hasil → fokus ke judul "Pesan siap dikirim". Bilah progres terisi
// per langkah (pradipta.css .pd-bar). Tanpa nomor WhatsApp → kartu dengan tombol ke bagian Kontak.
import { ArrowLeft, Check, CircleAlert, Lock, PencilLine } from 'lucide-react';
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { field, list, text, whatsappHref } from '../shared/utils';
import {
  EMPTY_SPMB,
  SPMB_MAX,
  STEP_FIELDS,
  STEP_LABELS,
  pathChoices,
  spmbMessage,
  uniqueTopics,
  validateSpmbStep,
  type PradiptaModel,
  type SpmbErrors,
  type SpmbForm,
} from './model';
import { BTN, C, INPUT, SCROLL_GAP, TYPE_P } from './styles';
import { ArrowDot, PillLink } from './ui';

type FieldKey = keyof SpmbForm;

function Field({
  id,
  label,
  error,
  hint,
  optional = false,
  className = '',
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-pd-field className={`min-w-0 ${className}`}>
      <label htmlFor={id} className={`mb-1.5 block text-[14px] font-semibold ${C.ink}`}>
        {label}
        {optional ? <span className={`font-normal ${C.muted}`}> (opsional)</span> : <span aria-hidden className="text-[#B42318]"> *</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
          <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className={`mt-1.5 text-[13px] ${C.muted}`}>
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Kartu pilihan (radio / kotak centang asli, disembunyikan secara visual) dengan tanda centang. */
function Choice({
  type,
  name,
  label,
  checked,
  onChange,
  inputRef,
  describedBy,
  invalid = false,
}: {
  type: 'radio' | 'checkbox';
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-[14px] bg-white px-4 py-2.5 text-[15px] font-medium ring-inset transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) ${C.ink} ${
        checked ? 'ring-2 ring-(--tpl-accent)' : invalid ? 'ring-2 ring-[#B42318]' : 'ring-1 ring-[#6F8297] hover:bg-(--pd-sky)'
      }`}
    >
      <input
        ref={inputRef}
        type={type}
        name={name}
        value={label}
        checked={checked}
        onChange={onChange}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${type === 'radio' ? 'rounded-full' : 'rounded-[6px]'} ${
          checked ? 'bg-(--tpl-accent) text-(--tpl-on-accent)' : 'bg-white ring-1 ring-inset ring-[#6F8297]'
        }`}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3.2} />}
      </span>
      <span className="min-w-0">{label}</span>
    </label>
  );
}

export function SpmbWizard({ m }: { m: PradiptaModel }) {
  const { spmb } = m;
  const baseId = useId();
  const [form, setForm] = useState<SpmbForm>(EMPTY_SPMB);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<SpmbErrors>({});
  const [sent, setSent] = useState<string | null>(null);
  const refs = useRef<Partial<Record<FieldKey, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const stepHeads = useRef<(HTMLHeadingElement | null)[]>([]);
  const resultHead = useRef<HTMLHeadingElement>(null);
  const paths = list(spmb, 'paths', 6)
    .map((item) => field(item, 'name'))
    .filter(Boolean);
  // Tanpa duplikat (nama jalur/topik ganda dari CMS tidak membuat dua pilihan yang sama-sama tercentang)
  const choices = pathChoices(paths);
  const topics = uniqueTopics(list(spmb, 'topics', 6).map((item) => field(item, 'name')));
  const title = text(spmb, 'form_title');
  const intro = text(spmb, 'form_text');
  const button = text(spmb, 'form_button') || 'Buka WhatsApp';
  const canSend = !!whatsappHref(m.spmbWhatsapp);
  const id = (key: FieldKey) => `${baseId}-${key}`;

  const set = <K extends FieldKey>(key: K, value: SpmbForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const invalid = (key: FieldKey, hint = false) =>
    errors[key]
      ? ({ 'aria-invalid': true, 'aria-describedby': `${id(key)}-error` } as const)
      : hint
        ? ({ 'aria-describedby': `${id(key)}-hint` } as const)
        : {};
  const ring = (key: FieldKey) => (errors[key] ? 'ring-2 ring-[#B42318]' : '');
  /** Fokus setelah render berikutnya; gulir secukupnya agar judul langkah terlihat. */
  const focusLater = (get: () => HTMLElement | null | undefined) =>
    window.setTimeout(() => {
      const el = get();
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView?.({ block: 'nearest' });
    }, 0);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const found = validateSpmbStep(step, form, paths);
    setErrors(found);
    const first = STEP_FIELDS[step].find((key) => found[key]);
    if (first) {
      // Gulir isian + labelnya + teks galat ke tengah layar (bukan ke tepi atas, di bawah header lengket)
      const el = refs.current[first];
      el?.focus({ preventScroll: true });
      el?.closest<HTMLElement>('[data-pd-field]')?.scrollIntoView?.({ block: 'center' });
      return;
    }
    if (step < STEP_LABELS.length - 1) {
      const next = step + 1;
      setStep(next);
      focusLater(() => stepHeads.current[next]);
      return;
    }
    setSent(spmbMessage(m.companyName, form));
    focusLater(() => resultHead.current);
  };

  const back = () => {
    const prev = Math.max(0, step - 1);
    setErrors({});
    setStep(prev);
    focusLater(() => stepHeads.current[prev]);
  };

  // Kartu formulir beda nada dengan pitanya: langit di pita putih, putih di pita langit (pita ikut section yang tampil)
  const onSky = m.tone('spmb') === 'sky';
  const card = `rounded-[24px] p-6 @3xl:p-8 @5xl:p-10 ${onSky ? 'bg-white' : 'bg-(--pd-sky)'}`;
  const finePrint = (
    <p className={`mt-4 flex items-start gap-2 text-[13px] leading-snug ${C.muted}`}>
      <Lock aria-hidden className="mt-px h-4 w-4 shrink-0" />
      Data tidak disimpan di website dan tidak ada pembayaran online.
    </p>
  );

  if (!canSend) {
    return (
      <div>
        <div className={card}>
          {title && <h3 className={`${C.ink} ${TYPE_P.h3}`}>{title}</h3>}
          <p className={`mt-2 ${C.body} ${TYPE_P.small}`}>Hubungi sekolah untuk bertanya tentang penerimaan murid baru.</p>
          <PillLink action={m.contactAction} label="Hubungi sekolah" variant="soft" className="mt-5 w-full @xl:w-auto" />
        </div>
        {finePrint}
      </div>
    );
  }

  const headClass = `${C.ink} ${TYPE_P.h3} ${SCROLL_GAP} focus:outline-none`;
  const stepHead = (i: number) => (
    <legend className="mb-5 w-full">
      <h3
        ref={(el) => {
          stepHeads.current[i] = el;
        }}
        tabIndex={-1}
        className={headClass}
      >
        <span className="sr-only">{`Langkah ${i + 1} dari ${STEP_LABELS.length}: `}</span>
        {STEP_LABELS[i]}
      </h3>
    </legend>
  );
  const textInput = (
    key: 'student' | 'origin' | 'domicile' | 'contact' | 'phone',
    label: string,
    options: { optional?: boolean; placeholder?: string; type?: string; autoComplete?: string; inputMode?: 'tel' | 'text'; wide?: boolean } = {},
  ) => (
    <Field id={id(key)} label={label} error={errors[key]} optional={options.optional} className={options.wide ? '@3xl:col-span-2' : ''}>
      <input
        ref={(el) => {
          refs.current[key] = el;
        }}
        id={id(key)}
        type={options.type ?? 'text'}
        inputMode={options.inputMode}
        autoComplete={options.autoComplete ?? 'off'}
        maxLength={SPMB_MAX[key]}
        value={form[key]}
        placeholder={options.placeholder}
        aria-required={options.optional ? undefined : true}
        onChange={(e) => set(key, e.target.value)}
        className={`${INPUT} h-12 ${ring(key)}`}
        {...invalid(key)}
      />
    </Field>
  );

  return (
    <div>
      {/* Layar lebar: kiri judul, pengantar, dan langkah berbilah progres; kanan isian langkah aktif / pesan jadi */}
      <div className={`${card} @5xl:grid @5xl:grid-cols-12 @5xl:gap-x-12`}>
        <div className="min-w-0 @5xl:col-span-5">
          {title && (
            <h3 id={`${baseId}-title`} className={`${C.ink} ${TYPE_P.h3} @3xl:text-[22px] @5xl:text-[26px]`}>
              {title}
            </h3>
          )}
          {intro && <p className={`mt-2 @5xl:mt-3 ${C.body} ${TYPE_P.small}`}>{intro}</p>}

          <ol aria-label="Langkah formulir" className="mt-6 grid grid-cols-3 gap-2 @5xl:mt-8">
            {STEP_LABELS.map((label, i) => {
              const done = sent !== null || i < step;
              const current = sent === null && i === step;
              return (
                <li key={label} aria-current={current ? 'step' : undefined} className="flex min-w-0 flex-col items-start gap-1.5 @xl:flex-row @xl:items-center @xl:gap-2">
                  <span
                    aria-hidden
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-200 ${
                      done
                        ? 'bg-(--tpl-accent) text-(--tpl-on-accent)'
                        : current
                          ? 'bg-white text-(--pd-ink) ring-2 ring-inset ring-(--tpl-accent)'
                          : `${onSky ? 'bg-(--pd-sky2)' : 'bg-white'} ${C.muted}`
                    }`}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className={`min-w-0 text-[13px] leading-tight @xl:truncate ${current ? `font-semibold ${C.ink}` : `font-medium ${C.muted}`}`}>
                    {label}
                    {done && <span className="sr-only"> (selesai)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <div aria-hidden className="mt-3 h-1 overflow-hidden rounded-full bg-(--pd-sky2)">
            <div className="pd-bar h-full rounded-full bg-(--tpl-accent)" style={{ transform: `scaleX(${sent !== null ? 1 : (step + 1) / STEP_LABELS.length})` }} />
          </div>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {sent !== null ? 'Pesan siap dikirim' : `Langkah ${step + 1} dari ${STEP_LABELS.length}: ${STEP_LABELS[step]}`}
          </p>
        </div>

        <div className="min-w-0 @5xl:col-span-7">
          {sent !== null ? (
            <div key="hasil" className="pd-step mt-7 @5xl:mt-0">
              <h3 ref={resultHead} tabIndex={-1} className={`flex items-center gap-2 ${headClass}`}>
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-full bg-(--tpl-accent) text-(--tpl-on-accent)">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
                Pesan siap dikirim
              </h3>
              <p className={`mt-2 ${C.body} ${TYPE_P.small}`}>Periksa isinya, lalu buka WhatsApp untuk mengirim ke panitia.</p>
              <pre className={`mt-4 whitespace-pre-wrap rounded-[16px] bg-white p-4 font-sans text-[14px] leading-relaxed ring-1 ring-inset ring-(--pd-ring) [overflow-wrap:anywhere] ${C.ink}`}>
                {sent}
              </pre>
              <div className="mt-5 flex flex-col gap-3 @xl:flex-row @xl:flex-wrap">
                <PillLink
                  action={m.waWith(sent, m.spmbWhatsapp)}
                  label={button}
                  variant="primary"
                  size="lg"
                  icon={<WhatsAppIcon className="h-5 w-5 shrink-0" />}
                  className="w-full @xl:w-auto"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSent(null);
                    setStep(0);
                    focusLater(() => stepHeads.current[0]);
                  }}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold ring-1 ring-inset ring-(--pd-ring) transition-colors duration-200 hover:bg-(--pd-sky2) ${C.ink}`}
                >
                  <PencilLine aria-hidden className="h-4 w-4" />
                  Ubah data
                </button>
              </div>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={onSubmit}
              aria-labelledby={title ? `${baseId}-title` : undefined}
              aria-label={title ? undefined : 'Formulir tanya SPMB'}
              className="mt-7 @5xl:mt-0"
            >
              {step === 0 && (
                <fieldset key="langkah-1" className="pd-step grid gap-4 @3xl:grid-cols-2">
                  {stepHead(0)}
                  {textInput('student', 'Nama calon murid', { autoComplete: 'name' })}
                  {textInput('origin', 'Asal SMP/MTs/sederajat')}
                  {textInput('domicile', 'Domisili (kecamatan/kabupaten)', { optional: true, placeholder: 'mis. Purbolinggo, Lampung Timur', wide: true })}
                </fieldset>
              )}
              {step === 1 && (
                <fieldset key="langkah-2" className="pd-step grid gap-5">
                  {stepHead(1)}
                  <fieldset data-pd-field aria-describedby={errors.path ? `${id('path')}-error` : undefined}>
                    <legend className={`mb-2 text-[14px] font-semibold ${C.ink}`}>
                      Jalur yang diminati<span aria-hidden className="text-[#B42318]"> *</span>
                    </legend>
                    <div className="grid gap-2 @xl:grid-cols-2 @6xl:grid-cols-3">
                      {choices.map((p, i) => (
                        <Choice
                          key={`${p}-${i}`}
                          type="radio"
                          name={`${baseId}-jalur`}
                          label={p}
                          checked={form.path === p}
                          onChange={() => set('path', p)}
                          invalid={!!errors.path}
                          describedBy={errors.path ? `${id('path')}-error` : undefined}
                          inputRef={
                            i === 0
                              ? (el) => {
                                  refs.current.path = el;
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                    {errors.path && (
                      <p id={`${id('path')}-error`} className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium text-[#B42318]">
                        <CircleAlert aria-hidden className="mt-px h-4 w-4 shrink-0" />
                        {errors.path}
                      </p>
                    )}
                  </fieldset>
                  {topics.length > 0 && (
                    <fieldset>
                      <legend className={`mb-2 text-[14px] font-semibold ${C.ink}`}>
                        Topik pertanyaan<span className={`font-normal ${C.muted}`}> (opsional)</span>
                      </legend>
                      <div className="flex flex-wrap gap-2">
                        {topics.map((t, i) => (
                          <Choice
                            key={`${t}-${i}`}
                            type="checkbox"
                            name={`${baseId}-topik`}
                            label={t}
                            checked={form.topics.includes(t)}
                            onChange={() => set('topics', form.topics.includes(t) ? form.topics.filter((x) => x !== t) : [...form.topics, t])}
                          />
                        ))}
                      </div>
                    </fieldset>
                  )}
                  <Field
                    id={id('question')}
                    label="Pertanyaan"
                    optional
                    error={errors.question}
                    hint={
                      <span className="flex justify-between gap-3">
                        <span>Tulis singkat; panitia membalas lewat WhatsApp.</span>
                        <span className="tabular-nums">
                          {form.question.length}/{SPMB_MAX.question}
                        </span>
                      </span>
                    }
                  >
                    <textarea
                      ref={(el) => {
                        refs.current.question = el;
                      }}
                      id={id('question')}
                      rows={4}
                      maxLength={SPMB_MAX.question}
                      value={form.question}
                      onChange={(e) => set('question', e.target.value)}
                      className={`${INPUT} min-h-28 resize-y py-3 ${ring('question')}`}
                      {...invalid('question', true)}
                    />
                  </Field>
                </fieldset>
              )}
              {step === 2 && (
                <fieldset key="langkah-3" className="pd-step grid gap-4 @3xl:grid-cols-2">
                  {stepHead(2)}
                  {/* Peran DULU, lalu nama yang labelnya mengikuti peran: pesan ke panitia tidak salah atribusi */}
                  <fieldset className="@3xl:col-span-2">
                    <legend className={`mb-2 text-[14px] font-semibold ${C.ink}`}>Saya adalah</legend>
                    <div className="grid gap-2 @xl:grid-cols-2">
                      <Choice type="radio" name={`${baseId}-peran`} label="Orang tua/wali" checked={form.role === 'parent'} onChange={() => set('role', 'parent')} />
                      <Choice
                        type="radio"
                        name={`${baseId}-peran`}
                        label="Calon murid"
                        checked={form.role === 'student'}
                        onChange={() => {
                          // Calon murid: nama kontak = nama di langkah 1 (bila belum diisi; nama itu sudah lolos validasi)
                          setForm((f) => ({ ...f, role: 'student', contact: f.contact.trim() ? f.contact : f.student.trim() }));
                          if (!form.contact.trim() && errors.contact) setErrors((e) => ({ ...e, contact: undefined }));
                        }}
                      />
                    </div>
                  </fieldset>
                  {textInput('contact', form.role === 'student' ? 'Nama Anda (calon murid)' : 'Nama orang tua/wali', { autoComplete: 'name' })}
                  {textInput('phone', 'Nomor WhatsApp', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: 'mis. 081234567890' })}
                </fieldset>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 @xl:flex-row @xl:items-center @xl:justify-between">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={back}
                    className={`inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-5 text-[15px] font-semibold ring-1 ring-inset ring-(--pd-ring) transition-colors duration-200 hover:bg-(--pd-sky2) ${C.ink}`}
                  >
                    <ArrowLeft aria-hidden className="h-4 w-4" />
                    Kembali
                  </button>
                ) : (
                  <span className="hidden @xl:block" />
                )}
                <button type="submit" className={`${BTN.primary} ${BTN.lg} w-full @xl:w-auto`}>
                  <span>{step < STEP_LABELS.length - 1 ? 'Lanjut' : 'Susun pesan'}</span>
                  <ArrowDot variant="primary" size="lg" />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {finePrint}
    </div>
  );
}
