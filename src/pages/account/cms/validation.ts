// Validasi isian CMS per tipe field (SPEC §7). Semua field boleh kosong; yang diisi harus berformat benar.
import { isListField, type SiteContent, type TemplateDefinition, type TemplateField } from '../../../templates/types';
import { fieldPath, readList, readText } from './content';

export type ContentErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;
const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const ANCHOR_PATTERN = /^#[a-z0-9_-]+$/i;
const BARE_DOMAIN_PATTERN = /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i;
const IFRAME_SRC_PATTERN = /<iframe[^>]*\ssrc=["'](https:\/\/[^"']+)["']/i;

/** Hapus spasi, titik, strip, dan kurung (sama seperti validasi nomor di server). */
export const normalizePhone = (value: string) => value.trim().replace(/[\s().-]+/g, '');

/**
 * Tautan yang dipahami renderer template: https://..., http://..., mailto:, tel:, path "/...", anchor "#kontak",
 * atau domain tanpa skema ("instagram.com/nama", otomatis diberi https://). Field peta juga menerima kode <iframe>.
 */
export function isValidLink(raw: string, key = ''): boolean {
  const value = raw.trim();
  if (!value) return true;
  if (ANCHOR_PATTERN.test(value)) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !/\s/.test(value)) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) return true;
  if (/^tel:\+?[0-9\s().-]{5,}$/i.test(value)) return true;
  if (/maps/i.test(key) && IFRAME_SRC_PATTERN.test(value)) return true;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
    } catch {
      return false;
    }
  }
  return BARE_DOMAIN_PATTERN.test(value);
}

/** Pesan error satu nilai field (undefined = valid). */
export function validateFieldValue(field: TemplateField, raw: string): string | undefined {
  if (field.maxLength && raw.length > field.maxLength) {
    return `Maksimal ${field.maxLength} karakter (sekarang ${raw.length}).`;
  }
  const value = raw.trim();
  if (!value) return undefined;
  switch (field.type) {
    case 'email':
      return EMAIL_PATTERN.test(value) ? undefined : 'Format email tidak valid, contoh: halo@perusahaan.co.id';
    case 'phone':
      return PHONE_PATTERN.test(normalizePhone(value)) ? undefined : 'Nomor tidak valid. Gunakan 8–15 digit angka, contoh: 081234567890.';
    case 'url':
      return isValidLink(value, field.key)
        ? undefined
        : 'Tautan tidak valid. Awali dengan https://, contoh: https://instagram.com/nama';
    case 'color':
      return HEX_PATTERN.test(value) ? undefined : 'Warna harus berformat hex, contoh: #211FFE.';
    default:
      return undefined;
  }
}

/** Semua error konten, dengan kunci path ("hero.title", "services.items.0.title"). */
export function validateContent(def: TemplateDefinition, content: SiteContent): ContentErrors {
  const errors: ContentErrors = {};
  for (const section of def.sections) {
    for (const field of section.fields) {
      if (isListField(field)) {
        readList(content, section.key, field.key).forEach((item, index) => {
          for (const sub of field.fields) {
            const message = validateFieldValue(sub, typeof item[sub.key] === 'string' ? item[sub.key] : '');
            if (message) errors[fieldPath(section.key, field.key, index, sub.key)] = message;
          }
        });
        if (field.max && readList(content, section.key, field.key).length > field.max) {
          errors[fieldPath(section.key, field.key)] = `Maksimal ${field.max} ${field.itemLabel.toLowerCase()}.`;
        }
      } else {
        const message = validateFieldValue(field, readText(content, section.key, field.key));
        if (message) errors[fieldPath(section.key, field.key)] = message;
      }
    }
  }
  return errors;
}

/** Path error pertama sesuai urutan form (validateContent mengisi error berurutan sesuai skema). */
export const firstErrorPath = (errors: ContentErrors): string | null => Object.keys(errors)[0] ?? null;

/** Kunci section dari sebuah path error. */
export const sectionOfPath = (path: string): string => path.split('.')[0];
