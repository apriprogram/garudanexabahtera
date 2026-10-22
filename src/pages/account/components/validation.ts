// Validasi form pembeli (login, daftar, pemesanan). Aturannya sama dengan server
// (backend/modules/templates.php: pf_str, pf_email, pf_phone, pf_domain) agar pesan error muncul sebelum dikirim.

/** Pola domain dari SPEC §6 (huruf kecil). */
export const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** Teks wajib/opsional dengan batas panjang. */
export function checkText(value: string, label: string, { required = true, min = 0, max = 255 } = {}): string | undefined {
  const text = value.trim();
  if (!text) return required ? `${label} wajib diisi.` : undefined;
  if (text.length < min) return `${label} minimal ${min} karakter.`;
  if (text.length > max) return `${label} maksimal ${max} karakter.`;
  return undefined;
}

export function checkEmail(value: string, label = 'Email'): string | undefined {
  const email = value.trim();
  if (!email) return `${label} wajib diisi.`;
  if (email.length > 150) return `${label} maksimal 150 karakter.`;
  if (!EMAIL_PATTERN.test(email)) return 'Format email tidak valid, contoh: nama@email.com';
  return undefined;
}

/** Hapus spasi, titik, strip, dan kurung (sama seperti server). */
export const normalizePhone = (value: string) => value.trim().replace(/[\s().-]+/g, '');

export function checkPhone(value: string, label = 'Nomor HP'): string | undefined {
  if (!value.trim()) return `${label} wajib diisi.`;
  if (!PHONE_PATTERN.test(normalizePhone(value))) {
    return `${label} tidak valid. Gunakan 8–15 digit angka, contoh: 081234567890.`;
  }
  return undefined;
}

export function checkPassword(value: string): string | undefined {
  if (!value) return 'Kata sandi wajib diisi.';
  if (value.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (value.length > 72) return 'Kata sandi maksimal 72 karakter.';
  return undefined;
}

/**
 * Rapikan isian domain: huruf kecil, tanpa "https://", path, atau titik di akhir.
 * "https://NamaBisnis.com/kontak" → "namabisnis.com"
 */
export function normalizeDomain(value: string): string {
  let domain = value.trim().toLowerCase();
  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  domain = domain.split(/[/?#\s]/)[0] ?? '';
  return domain.replace(/\.+$/, '');
}

export function checkDomain(value: string, label: string, required: boolean): string | undefined {
  const domain = normalizeDomain(value);
  if (!domain) return required ? `${label} wajib diisi.` : undefined;
  if (domain.length > 253) return `${label} maksimal 253 karakter.`;
  if (!DOMAIN_PATTERN.test(domain)) return 'Format domain tidak valid, contoh: namabisnis.com';
  return undefined;
}

/** true bila objek error berisi minimal satu pesan. */
export const hasErrors = (errors: Record<string, string | undefined>) => Object.values(errors).some(Boolean);

/** Fokus ke field pertama yang error (urutan sesuai daftar id). */
export function focusFirstError(order: string[], errors: Record<string, string | undefined>) {
  const first = order.find((key) => errors[key]);
  if (!first) return;
  const el = document.getElementById(first);
  if (el) {
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
