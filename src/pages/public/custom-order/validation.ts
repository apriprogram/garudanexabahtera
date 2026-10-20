// Validasi formulir pesanan custom (submit_custom_order, SPEC §6). Aturannya mengikuti server
// (backend/modules/templates.php pf_submit_custom_order) agar error muncul sebelum dikirim.

export type ServiceType = 'website' | 'mobile_app';

export interface CustomOrderValues {
  name: string;
  email: string;
  phone: string;
  company: string;
  service_type: ServiceType | '';
  project_name: string;
  description: string;
  budget_note: string;
  /** Honeypot: tidak terlihat oleh pengunjung, harus tetap kosong */
  website: string;
}

export type CustomOrderField = Exclude<keyof CustomOrderValues, 'website'>;
export type CustomOrderErrors = Partial<Record<CustomOrderField, string>>;

/** Urutan field di formulir (untuk fokus ke error pertama). */
export const FIELD_ORDER: CustomOrderField[] = ['name', 'email', 'phone', 'company', 'service_type', 'project_name', 'description', 'budget_note'];

export const LIMITS = {
  name: 150,
  email: 150,
  phone: 30,
  company: 150,
  project_name: 150,
  description: 5000,
  budget_note: 255,
} as const;

/** Minimal karakter deskripsi agar tim bisa menyusun penawaran (server menerima ≥ 10). */
export const DESCRIPTION_MIN = 20;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;

export const normalizePhone = (value: string) => value.trim().replace(/[\s().-]+/g, '');

export const EMPTY_VALUES: CustomOrderValues = {
  name: '',
  email: '',
  phone: '',
  company: '',
  service_type: '',
  project_name: '',
  description: '',
  budget_note: '',
  website: '',
};

function text(value: string, label: string, max: number, { required = false, min = 0 } = {}): string | undefined {
  const v = value.trim();
  if (!v) return required ? `${label} wajib diisi.` : undefined;
  if (v.length < min) return `${label} minimal ${min} karakter.`;
  if (v.length > max) return `${label} maksimal ${max} karakter.`;
  return undefined;
}

export function validateField(field: CustomOrderField, values: CustomOrderValues): string | undefined {
  switch (field) {
    case 'name':
      return text(values.name, 'Nama', LIMITS.name, { required: true, min: 2 });
    case 'email': {
      const error = text(values.email, 'Email', LIMITS.email, { required: true });
      if (error) return error;
      return EMAIL_PATTERN.test(values.email.trim()) ? undefined : 'Format email tidak valid, contoh: nama@email.com';
    }
    case 'phone': {
      if (!values.phone.trim()) return 'Nomor WhatsApp wajib diisi.';
      return PHONE_PATTERN.test(normalizePhone(values.phone))
        ? undefined
        : 'Nomor tidak valid. Gunakan 8–15 digit angka, contoh: 081234567890.';
    }
    case 'company':
      return text(values.company, 'Nama perusahaan', LIMITS.company);
    case 'service_type':
      return values.service_type ? undefined : 'Pilih jenis layanan: Website atau Aplikasi Mobile.';
    case 'project_name':
      return text(values.project_name, 'Nama proyek', LIMITS.project_name);
    case 'description': {
      const v = values.description.trim();
      if (!v) return 'Ceritakan kebutuhan Anda.';
      if (v.length < DESCRIPTION_MIN) {
        return `Tulis minimal ${DESCRIPTION_MIN} karakter agar kami bisa memahami kebutuhan Anda (sekarang ${v.length}).`;
      }
      return v.length > LIMITS.description ? `Deskripsi maksimal ${LIMITS.description} karakter.` : undefined;
    }
    case 'budget_note':
      return text(values.budget_note, 'Catatan anggaran', LIMITS.budget_note);
    default:
      return undefined;
  }
}

export function validateAll(values: CustomOrderValues): CustomOrderErrors {
  const errors: CustomOrderErrors = {};
  for (const field of FIELD_ORDER) {
    const message = validateField(field, values);
    if (message) errors[field] = message;
  }
  return errors;
}

/** Data yang dikirim ke submit_custom_order (teks di-trim, opsional kosong tidak dikirim). */
export function toPayload(values: CustomOrderValues): Record<string, string> {
  const payload: Record<string, string> = {
    name: values.name.trim(),
    email: values.email.trim(),
    phone: normalizePhone(values.phone),
    service_type: values.service_type,
    description: values.description.trim(),
    website: values.website,
  };
  if (values.company.trim()) payload.company = values.company.trim();
  if (values.project_name.trim()) payload.project_name = values.project_name.trim();
  if (values.budget_note.trim()) payload.budget_note = values.budget_note.trim();
  return payload;
}
