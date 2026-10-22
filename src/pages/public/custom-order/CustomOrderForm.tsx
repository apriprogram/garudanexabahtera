// Formulir pesanan jasa custom (website / aplikasi mobile) → submit_custom_order (SPEC §6).
// Validasi per field (saat keluar field, lalu langsung setelah percobaan kirim), error server per field,
// honeypot "website" tersembunyi, tombol kirim dengan status memuat. `?layanan=website|mobile` memilih jenis layanan.
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useHydrated } from '../../../lib/preload';
import { CircleAlert, Loader2, Send } from 'lucide-react';
import { ApiError, apiPost, errorMessage } from '../../../lib/api';
import { Field } from '../../account/components/Field';
import { describedBy } from './a11y';
import { CharCounter } from './CharCounter';
import { ServiceTypePicker } from './ServiceTypePicker';
import {
  DESCRIPTION_MIN,
  EMPTY_VALUES,
  FIELD_ORDER,
  LIMITS,
  REQUIRED_FIELDS,
  serviceFromParam,
  toPayload,
  validateAll,
  validateField,
  type CustomOrderErrors,
  type CustomOrderField,
  type CustomOrderValues,
  type ServiceType,
} from './validation';

export interface CustomOrderResult {
  reference: string;
  serviceType: ServiceType;
}

interface CustomOrderFormProps {
  /** Isian awal (mis. nama/email/nomor dari akun pembeli yang sedang login) */
  initialValues?: Partial<CustomOrderValues>;
  onSuccess: (result: CustomOrderResult) => void;
}

const fid = (field: string) => `co-${field.replace(/_/g, '-')}`;

export function CustomOrderForm({ initialValues, onSuccess }: CustomOrderFormProps) {
  // Tautan Footer "Website custom" / "Aplikasi mobile custom" → /pesan-custom?layanan=website|mobile
  // Query string tidak ada di HTML prerender: dibaca setelah hidrasi (perubahan diikuti oleh seenLayanan di bawah)
  const [searchParams] = useSearchParams();
  const hydrated = useHydrated();
  const layanan = serviceFromParam(hydrated ? searchParams.get('layanan') : null);
  const [values, setValues] = useState<CustomOrderValues>(() => ({
    ...EMPTY_VALUES,
    service_type: layanan,
    ...initialValues,
  }));
  const [errors, setErrors] = useState<CustomOrderErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Parameter berubah saat halaman sudah terbuka (mis. tautan Footer diklik di /pesan-custom): ikuti pilihan baru
  const [seenLayanan, setSeenLayanan] = useState(layanan);
  if (layanan !== seenLayanan) {
    setSeenLayanan(layanan);
    if (layanan) {
      setValues((prev) => ({ ...prev, service_type: layanan }));
      setErrors((prev) => ({ ...prev, service_type: undefined }));
    }
  }

  const hasDraft = values.description.trim().length > 0 || values.project_name.trim().length > 0;

  // Tutup tab / muat ulang dengan isian kebutuhan yang belum dikirim → peringatan browser
  useEffect(() => {
    if (!hasDraft || submitting) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasDraft, submitting]);

  const set = <K extends keyof CustomOrderValues>(field: K, value: CustomOrderValues[K]) => {
    const next = { ...values, [field]: value };
    setValues(next);
    setFormError('');
    // Setelah percobaan kirim (atau field sudah error), validasi langsung saat mengetik
    if (field !== 'website' && (submitted || errors[field as CustomOrderField])) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field as CustomOrderField, next) }));
    }
  };

  const blur = (field: CustomOrderField) => {
    // Field kosong yang belum pernah diisi tidak langsung dimarahi; cukup saat kirim
    if (!submitted && !values[field].trim()) return;
    setErrors((prev) => ({ ...prev, [field]: validateField(field, values) }));
  };

  const focusFirst = (found: CustomOrderErrors) => {
    const first = FIELD_ORDER.find((field) => found[field]);
    if (!first) return;
    const el = document.getElementById(fid(first));
    el?.focus({ preventScroll: true });
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitted(true);
    setFormError('');
    const found = validateAll(values);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirst(found);
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<{ success: boolean; reference: string }>('submit_custom_order', toPayload(values));
      onSuccess({ reference: res.reference, serviceType: values.service_type as ServiceType });
    } catch (err) {
      const fieldErrors: CustomOrderErrors = {};
      if (err instanceof ApiError && err.fieldErrors) {
        for (const [key, message] of Object.entries(err.fieldErrors)) {
          if ((FIELD_ORDER as string[]).includes(key)) fieldErrors[key as CustomOrderField] = message;
        }
      }
      if (Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        setFormError('Periksa kembali isian yang ditandai.');
        focusFirst(fieldErrors);
      } else {
        setFormError(errorMessage(err, 'Kebutuhan Anda gagal dikirim. Silakan coba lagi.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const text = (field: Exclude<CustomOrderField, 'service_type'>) => ({
    id: fid(field),
    name: field,
    value: values[field],
    disabled: submitting,
    onChange: (e: { target: { value: string } }) => set(field, e.target.value),
    onBlur: () => blur(field),
    'aria-invalid': errors[field] ? (true as const) : undefined,
    'aria-required': REQUIRED_FIELDS.includes(field) ? (true as const) : undefined,
    className: 'input-site',
  });

  const descriptionLength = values.description.trim().length;

  return (
    <form noValidate onSubmit={submit} aria-describedby={formError ? 'co-form-error' : undefined} className="relative space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={fid('name')} label="Nama lengkap" error={errors.name}>
          <input {...text('name')} type="text" autoComplete="name" maxLength={LIMITS.name} placeholder="mis. Budi Santoso" aria-describedby={describedBy(fid('name'), { error: errors.name })} />
        </Field>
        <Field id={fid('email')} label="Email" error={errors.email}>
          <input
            {...text('email')}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            maxLength={LIMITS.email}
            placeholder="mis. nama@email.com"
            aria-describedby={describedBy(fid('email'), { error: errors.email })}
          />
        </Field>
        <Field id={fid('phone')} label="Nomor WhatsApp" error={errors.phone} help="Kami menghubungi Anda lewat nomor ini.">
          <input
            {...text('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={LIMITS.phone}
            placeholder="mis. 0812-3456-7890"
            aria-describedby={describedBy(fid('phone'), { error: errors.phone, help: true })}
          />
        </Field>
        <Field id={fid('company')} label="Nama perusahaan / instansi" optional error={errors.company}>
          <input
            {...text('company')}
            type="text"
            autoComplete="organization"
            maxLength={LIMITS.company}
            placeholder="mis. PT Maju Bersama"
            aria-describedby={describedBy(fid('company'), { error: errors.company })}
          />
        </Field>
      </div>

      <ServiceTypePicker
        id={fid('service_type')}
        value={values.service_type}
        onChange={(value) => set('service_type', value)}
        error={errors.service_type}
        disabled={submitting}
      />

      <Field id={fid('project_name')} label="Nama proyek" optional error={errors.project_name}>
        <input
          {...text('project_name')}
          type="text"
          autoComplete="off"
          maxLength={LIMITS.project_name}
          placeholder="mis. Aplikasi pemesanan katering"
          aria-describedby={describedBy(fid('project_name'), { error: errors.project_name })}
        />
      </Field>

      <Field
        id={fid('description')}
        label="Detail kebutuhan"
        error={errors.description}
        help={`Tujuan, fitur utama, pengguna, dan target waktu. Minimal ${DESCRIPTION_MIN} karakter.`}
        aside={<CharCounter id={`${fid('description')}-count`} length={values.description.length} max={LIMITS.description} />}
      >
        <textarea
          {...text('description')}
          rows={6}
          maxLength={LIMITS.description}
          placeholder="mis. Kami butuh website company profile 5 halaman dengan formulir kontak dan blog, bisa diubah sendiri oleh tim kami, target selesai dalam 2 bulan."
          aria-describedby={describedBy(fid('description'), { error: errors.description, help: true, extra: `${fid('description')}-count` })}
          className="input-site resize-y"
        />
        {!errors.description && descriptionLength > 0 && descriptionLength < DESCRIPTION_MIN && (
          <p className="sr-only" aria-live="polite">
            Kurang {DESCRIPTION_MIN - descriptionLength} karakter lagi.
          </p>
        )}
      </Field>

      <Field
        id={fid('budget_note')}
        label="Catatan anggaran atau tenggat"
        optional
        error={errors.budget_note}
        help="Tidak ada daftar harga untuk jasa custom. Biaya final kami sampaikan lewat penawaran setelah kebutuhan Anda jelas."
      >
        <input
          {...text('budget_note')}
          type="text"
          autoComplete="off"
          maxLength={LIMITS.budget_note}
          placeholder="mis. Anggaran terbatas, ingin rilis sebelum Desember"
          aria-describedby={describedBy(fid('budget_note'), { error: errors.budget_note, help: true })}
        />
      </Field>

      {/* Honeypot anti-bot: tidak terlihat dan tidak bisa difokus pengunjung; bot yang mengisinya diabaikan server */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] top-0 h-px w-px overflow-hidden opacity-0">
        <label htmlFor="co-website">Website</label>
        <input
          id="co-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </div>

      {formError && (
        <div id="co-form-error" role="alert" className="flex gap-3 rounded-2xl bg-danger-50 px-4 py-3.5 text-sm text-danger-700 ring-1 ring-inset ring-danger/20">
          <CircleAlert className="mt-px h-[18px] w-[18px] shrink-0 text-danger" aria-hidden />
          <p className="leading-relaxed">{formError}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-subtle sm:max-w-xs">
          Data Anda hanya dipakai untuk menghubungi Anda terkait kebutuhan ini.
        </p>
        <button type="submit" disabled={submitting} className="btn btn-primary btn-lg w-full sm:w-auto">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {submitting ? 'Mengirim...' : 'Kirim Kebutuhan'}
        </button>
      </div>
    </form>
  );
}
