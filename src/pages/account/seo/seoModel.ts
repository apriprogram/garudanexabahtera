// Penolong murni halaman SEO situs di panel akun (/akun/situs/:siteId/seo): isian form, validasi yang sama dengan
// server (validateSiteSeo di backend/modules/site_posts.js; pesan sama persis), kode verifikasi dari tag meta, isian
// yang dikirim ke customer_save_site_seo, dan teks pilihan (jenis organisasi, tampil di Google, alasan tidak tampil).
import {
  SITE_SCHEMA_TYPES,
  SITE_SEO_LIMITS,
  type SiteIndexMode,
  type SiteIndexReason,
  type SiteSchemaType,
  type SiteSeoSettings,
} from '../../../types/sitePosts';
import { charCount, cleanLine } from '../posts/postModel';

export interface SeoDraft {
  title: string;
  description: string;
  /** '' = tanpa gambar; data:image/… = gambar baru; path/URL = gambar tersimpan */
  og_image: string;
  /** Kode, atau seluruh tag <meta …> yang ditempel (server mengambil nilai content-nya) */
  google_verification: string;
  bing_verification: string;
  index_mode: SiteIndexMode;
  schema_type: SiteSchemaType;
}

export type SeoField = keyof SeoDraft;
export type SeoErrors = Partial<Record<SeoField, string>>;

/** Urutan kolom di form: error pertama di urutan ini yang difokuskan. */
export const SEO_FIELDS: readonly SeoField[] = [
  'title',
  'description',
  'og_image',
  'index_mode',
  'schema_type',
  'google_verification',
  'bing_verification',
];

export const isSeoField = (key: string): key is SeoField => (SEO_FIELDS as readonly string[]).includes(key);

export function draftFromSeo(seo: SiteSeoSettings): SeoDraft {
  return {
    title: seo.title,
    description: seo.description,
    og_image: seo.og_image ?? '',
    google_verification: seo.google_verification,
    bing_verification: seo.bing_verification,
    index_mode: seo.index_mode,
    schema_type: (SITE_SCHEMA_TYPES as readonly string[]).includes(seo.schema_type) ? seo.schema_type : '',
  };
}

/** Isian yang dikirim ke customer_save_site_seo. og_image: path tersimpan = tetap, data URI = unggah, null = hapus. */
export function inputFromSeoDraft(draft: SeoDraft): Omit<SiteSeoSettings, 'updated_at'> {
  return {
    title: cleanLine(draft.title),
    description: cleanLine(draft.description),
    og_image: draft.og_image.trim() === '' ? null : draft.og_image,
    google_verification: draft.google_verification.trim(),
    bing_verification: draft.bing_verification.trim(),
    index_mode: draft.index_mode,
    schema_type: draft.schema_type,
  };
}

const VERIFICATION_PATTERN = /^[A-Za-z0-9_-]{10,100}$/;
/** Tempelan seluruh tag <meta …> masih muat (VERIFICATION_INPUT_MAX di server) */
const VERIFICATION_INPUT_MAX = 500;

/**
 * Kode verifikasi dari isian: kode apa adanya atau nilai content dari seluruh tag <meta … content="KODE">.
 * '' = dikosongkan (dihapus), null = tidak valid. Sama dengan verificationToken() di server.
 */
export function verificationToken(value: string): string | null {
  let token = value.trim();
  if (token === '') return '';
  if (charCount(token) > VERIFICATION_INPUT_MAX) return null;
  if (token.includes('<')) {
    const m = /\bcontent[ \t\r\n]*=[ \t\r\n]*(["'])([^"']*)\1/i.exec(token);
    if (!m) return null;
    token = m[2].trim();
  }
  return VERIFICATION_PATTERN.test(token) ? token : null;
}

export const GOOGLE_VERIFICATION_ERROR =
  'Kode verifikasi Google tidak valid. Tempel kode dari Google Search Console atau seluruh tag meta-nya.';
export const BING_VERIFICATION_ERROR = 'Kode verifikasi Bing tidak valid. Tempel kode dari Bing Webmaster Tools atau seluruh tag meta-nya.';

/** Pemeriksaan sebelum dikirim, sama dengan validasi server. {} = sah. */
export function validateSeoDraft(draft: SeoDraft): SeoErrors {
  const errors: SeoErrors = {};
  if (charCount(cleanLine(draft.title)) > SITE_SEO_LIMITS.title) errors.title = `Judul di Google maksimal ${SITE_SEO_LIMITS.title} karakter.`;
  if (charCount(cleanLine(draft.description)) > SITE_SEO_LIMITS.description) {
    errors.description = `Deskripsi di Google maksimal ${SITE_SEO_LIMITS.description} karakter.`;
  }
  if (verificationToken(draft.google_verification) === null) errors.google_verification = GOOGLE_VERIFICATION_ERROR;
  if (verificationToken(draft.bing_verification) === null) errors.bing_verification = BING_VERIFICATION_ERROR;
  return errors;
}

/** Label jenis organisasi (schema.org) dalam bahasa sehari-hari. '' = otomatis. */
export const SCHEMA_LABEL: Record<SiteSchemaType, string> = {
  '': 'Otomatis',
  Organization: 'Organisasi atau perusahaan',
  LocalBusiness: 'Usaha lokal (toko, kafe, jasa)',
  School: 'Sekolah',
  EducationalOrganization: 'Lembaga pendidikan / kursus',
  Preschool: 'PAUD / TK',
  ElementarySchool: 'SD / MI',
  MiddleSchool: 'SMP / MTs',
  HighSchool: 'SMA / SMK / MA',
  CollegeOrUniversity: 'Perguruan tinggi',
};

/** Pilihan "Tampil di Google". isSchool = template sekolah (teks "nama sekolah", bukan "nama usaha"). */
export const indexModeOptions = (isSchool: boolean): { value: SiteIndexMode; label: string; text: string }[] => [
  {
    value: 'auto',
    label: 'Otomatis (disarankan)',
    text: `Tampil di Google setelah nama ${isSchool ? 'sekolah' : 'usaha'} di situs diganti dari nama contoh template.`,
  },
  { value: 'index', label: 'Ya, tampilkan', text: 'Izinkan Google menampilkan situs sekarang juga.' },
  { value: 'noindex', label: 'Tidak, sembunyikan', text: 'Situs tidak muncul di Google, mis. selama isinya masih disiapkan.' },
];

/** Urutan alasan di kartu status (sama dengan server). */
export const REASON_ORDER: readonly SiteIndexReason[] = ['suspended', 'manual_noindex', 'default_content'];
