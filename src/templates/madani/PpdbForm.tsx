// Formulir minat PPDB tanpa server: menyusun pesan WhatsApp untuk panitia (./model.ts ppdbMessage). TIDAK menyimpan
// data dan tidak menerima pembayaran — dikatakan jelas di atas tombol. Validasi di browser (pesan error per field,
// aria-invalid + aria-describedby, fokus ke field salah pertama). Pratinjau (demo/CMS): WhatsApp tidak dibuka, tetapi
// pesan yang akan terkirim ditampilkan. Situs live: WhatsApp dibuka di tab baru + tautan cadangan.
import { CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import { forwardRef, useId, useImperativeHandle, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { WhatsAppIcon } from '../shared/icons';
import { useTemplateRuntime } from '../shared/runtime';
import { whatsappHref } from '../shared/utils';
import { EMPTY_PPDB, PPDB_FIELDS, ppdbMessage, validatePpdb, type PpdbErrors, type PpdbForm as FormValues } from './model';
import { BTN, C, DISPLAY } from './styles';

export interface PpdbFormHandle {
  /** Gulir ke formulir dan fokus ke field pertama; `track` (dari tab jalur) langsung dipilih di formulir */
  focusForm: (track?: string) => void;
}

interface Props {
  title: string;
  intro: string;
  button: string;
  tracks: string[];
  programs: string[];
  whatsapp: string;
  school: string;
  period: string;
}

const INPUT =
  'block w-full rounded-xl bg-white px-4 text-[16px] text-[#1E2420] ring-1 ring-inset ring-black/[0.14] placeholder:text-[#6B706C] hover:ring-black/25 focus:outline-none focus:ring-2 focus:ring-(--md-primary) aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#B42318]';
const LABEL = 'mb-1.5 block text-[13.5px] font-semibold text-(--md-deep)';

type Result = { kind: 'sent'; href: string; message: string } | { kind: 'preview'; message: string } | { kind: 'unavailable'; message: string } | null;

export const PpdbForm = forwardRef<PpdbFormHandle, Props>(function PpdbForm({ title, intro, button, tracks, programs, whatsapp, school, period }, ref) {
  const { preview } = useTemplateRuntime();
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_PPDB);
  const [errors, setErrors] = useState<PpdbErrors>({});
  const [result, setResult] = useState<Result>(null);
  const id = (key: keyof FormValues) => `${uid}-${key}`;

  useImperativeHandle(ref, () => ({
    focusForm: (track?: string) => {
      if (track) {
        setValues((prev) => ({ ...prev, track }));
        setErrors((prev) => ({ ...prev, track: undefined }));
      }
      const form = formRef.current;
      const reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      form?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => document.getElementById(id('student'))?.focus({ preventScroll: true }), 350);
    },
  }));

  const set = (key: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const next = validatePpdb(values, { tracks, programs });
    setErrors(next);
    const first = PPDB_FIELDS.find((key) => next[key]);
    if (first) {
      setResult(null);
      document.getElementById(first === 'gender' ? `${id('gender')}-0` : id(first))?.focus();
      return;
    }
    const message = ppdbMessage(values, { school, period });
    const href = whatsappHref(whatsapp, message);
    if (preview) return setResult({ kind: 'preview', message });
    if (!href) return setResult({ kind: 'unavailable', message });
    window.open(href, '_blank', 'noopener,noreferrer');
    setResult({ kind: 'sent', href, message });
  };

  const error = (key: keyof FormValues) =>
    errors[key] ? (
      <p id={`${id(key)}-error`} className="mt-1.5 text-[13px] font-medium text-[#B42318]">
        {errors[key]}
      </p>
    ) : null;
  const described = (key: keyof FormValues) => (errors[key] ? `${id(key)}-error` : undefined);

  const field = (key: 'student' | 'school' | 'parent' | 'phone', label: string, extra: Record<string, string | number>, hint?: ReactNode) => (
    <div>
      <label htmlFor={id(key)} className={LABEL}>
        {label}
      </label>
      <input
        id={id(key)}
        value={values[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={described(key)}
        className={`h-12 ${INPUT}`}
        {...extra}
      />
      {hint}
      {error(key)}
    </div>
  );

  const select = (key: 'track' | 'program', label: string, options: string[], placeholder: string) =>
    options.length > 0 ? (
      <div>
        <label htmlFor={id(key)} className={LABEL}>
          {label}
        </label>
        <select
          id={id(key)}
          value={values[key]}
          onChange={(e) => set(key, e.target.value)}
          aria-invalid={errors[key] ? true : undefined}
          aria-describedby={described(key)}
          className={`h-12 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2024%2024'%20fill='none'%20stroke='%23585E5A'%20stroke-width='2'%3E%3Cpath%20d='m6%209%206%206%206-6'/%3E%3C/svg%3E")] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10 ${INPUT}`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        {error(key)}
      </div>
    ) : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-labelledby={`${uid}-title`} className="scroll-mt-[calc(var(--tpl-sticky-top,0px)+96px)]">
      <h3 id={`${uid}-title`} className={`${DISPLAY} text-[21px] leading-snug tracking-[-0.015em] text-(--md-deep) @3xl:text-[23px]`}>
        {title}
      </h3>
      {intro && (
        <p className={`mt-2 flex gap-2 text-[13.5px] leading-relaxed ${C.muted}`}>
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-(--md-ink)" aria-hidden />
          <span>{intro}</span>
        </p>
      )}

      <div className="mt-6 grid gap-4">
        {field('student', 'Nama lengkap calon siswa', { autoComplete: 'name', maxLength: 80, placeholder: 'Sesuai akta kelahiran' })}

        <fieldset aria-describedby={described('gender')}>
          <legend className={LABEL}>Jenis kelamin</legend>
          <div className="grid grid-cols-2 gap-2">
            {['Putra', 'Putri'].map((option, i) => (
              <label
                key={option}
                className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl text-[15px] font-semibold ring-1 ring-inset transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--tpl-accent-ink) ${
                  values.gender === option ? 'bg-(--md-deep) text-white ring-(--md-deep)' : `bg-white text-(--md-deep) ${errors.gender ? 'ring-2 ring-[#B42318]' : 'ring-black/[0.14] hover:ring-black/25'}`
                }`}
              >
                <input
                  id={`${id('gender')}-${i}`}
                  type="radio"
                  name={`${uid}-gender`}
                  value={option}
                  checked={values.gender === option}
                  onChange={() => set('gender', option)}
                  aria-invalid={errors.gender ? true : undefined}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </div>
          {error('gender')}
        </fieldset>

        {field('school', 'Asal sekolah (SMP/MTs)', { autoComplete: 'off', maxLength: 80, placeholder: 'mis. SMP IT Al-Ihsan' })}
        <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-1 @7xl:grid-cols-2">
          {select('track', 'Jalur pendaftaran', tracks, 'Pilih jalur')}
          {select('program', 'Program', programs, 'Pilih program')}
        </div>
        {field('parent', 'Nama orang tua / wali', { autoComplete: 'off', maxLength: 80, placeholder: 'Nama ayah, ibu, atau wali' })}
        {field('phone', 'Nomor WhatsApp orang tua', { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 20, placeholder: 'mis. 081234567890' })}
        <div>
          <label htmlFor={id('note')} className={LABEL}>
            Catatan <span className={`font-normal ${C.muted}`}>(opsional)</span>
          </label>
          <textarea
            id={id('note')}
            value={values.note}
            onChange={(e) => set('note', e.target.value)}
            rows={3}
            maxLength={400}
            placeholder="mis. ingin bertanya tentang beasiswa"
            className={`min-h-[96px] py-3 leading-relaxed ${INPUT}`}
          />
        </div>
      </div>

      <button type="submit" className={`${BTN.primary} ${BTN.lg} mt-6 w-full px-6`}>
        <WhatsAppIcon className="h-5 w-5 shrink-0" />
        {button || 'Kirim lewat WhatsApp'}
      </button>

      <div aria-live="polite">
        {result && (
          <div className="mt-5 rounded-[18px] bg-(--md-tint) p-4 text-[13.5px] leading-relaxed text-(--md-deep)">
            <p className="flex items-start gap-2 font-medium">
              {result.kind === 'sent' ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-(--md-ink)" aria-hidden />
              ) : (
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-(--md-ink)" aria-hidden />
              )}
              <span>
                {result.kind === 'sent' && (
                  <>
                    Pesan sudah disiapkan di WhatsApp.{' '}
                    <a href={result.href} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                      Buka lagi
                    </a>{' '}
                    bila jendela WhatsApp tidak terbuka.
                  </>
                )}
                {result.kind === 'preview' && 'Ini pratinjau. Di situs asli, pesan di bawah ini dibuka di WhatsApp panitia PPDB.'}
                {result.kind === 'unavailable' && 'Nomor WhatsApp panitia belum tersedia. Silakan hubungi sekolah lewat telepon atau datang langsung.'}
              </span>
            </p>
            <p className={`mt-3 text-[12px] font-semibold uppercase tracking-[0.1em] ${C.muted}`}>Isi pesan</p>
            <p data-ppdb-message="" className="mt-1.5 whitespace-pre-line rounded-xl bg-white p-3 text-[13px] text-[#3F4541]">
              {result.message}
            </p>
          </div>
        )}
      </div>
    </form>
  );
});
