import { DOMAIN_PRICE_FROM, hostingRenewalPrice, rupiahCompact } from '../lib/domainPricing';
import { ADDON_POSTS_PRICE_DEFAULT, ADDON_POSTS_PRICE_SETTING } from '../types/siteAddons';
import { useCachedJson } from './useCachedJson';

/** Isi tabel hero_settings dari /api.php?action=get_settings (semua nilai berupa string). */
export type SiteSettings = Record<string, string | undefined>;

const ENDPOINT = '/api.php?action=get_settings';
const DEFAULT_WHATSAPP = '6285188009152';
/** Kontak bawaan bila setting kosong. Domain email = garudanexa.com (garudanexa.co.id tidak ada / NXDOMAIN). */
export const DEFAULT_CONTACT_EMAIL = 'info@garudanexa.com';
export const DEFAULT_CONTACT_PHONE = '085188009152';
const EMPTY: SiteSettings = {};

const normalizeSettings = (data: unknown): SiteSettings =>
  data && typeof data === 'object' && !Array.isArray(data) && !('error' in data) ? (data as SiteSettings) : EMPTY;

/**
 * Pengaturan website publik, di-fetch sekali per muat halaman. `loaded` bernilai true setelah request selesai
 * (berhasil atau gagal), sehingga komponen bisa menunggu agar konten bawaan tidak berkedip berganti konten dari admin.
 */
export const useSiteSettings = () => {
  const { data, loaded } = useCachedJson(ENDPOINT, normalizeSettings, EMPTY);
  return { settings: data, loaded };
};

/** Baca setting berformat JSON array. Kosong/tidak valid → `fallback`; array kosong dari admin tetap dihormati. */
export const readList = <T,>(raw: string | undefined, fallback: T[], { allowEmpty = true } = {}): T[] => {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.length > 0 || allowEmpty ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
};

/** Section yang disembunyikan admin lewat setting `disabled_sections` (mis. `["pricing"]`). */
export const getHiddenSections = (settings: SiteSettings): Set<string> =>
  new Set(
    readList<unknown>(settings.disabled_sections, [])
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim().toLowerCase()),
  );

/**
 * Nomor WhatsApp (hanya angka, berkode negara) dari setting footer. wa.me butuh kode negara, jadi nomor yang ditulis
 * admin dalam format lokal ("0851…") diubah menjadi "62851…".
 */
export const getWhatsappNumber = (settings: SiteSettings): string => {
  const digits = (settings.footer_whatsapp || '').replace(/\D/g, '');
  if (!digits) return DEFAULT_WHATSAPP;
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
};

export const whatsappUrl = (number: string, message?: string): string =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

/** Email kontak publik (setting `footer_email`, cadangan info@garudanexa.com). */
export const getContactEmail = (settings: SiteSettings): string =>
  (settings.footer_email || '').trim() || DEFAULT_CONTACT_EMAIL;

/** Nomor telepon kontak publik apa adanya dari setting `footer_phone` (tampilkan lewat `displayPhone`). */
export const getContactPhone = (settings: SiteSettings): string =>
  (settings.footer_phone || '').trim() || DEFAULT_CONTACT_PHONE;

/**
 * Nomor telepon yang mudah dibaca: nomor HP Indonesia dikelompokkan 4-4-sisa ("085188009152" → "0851-8800-9152";
 * "+62 851…" → "0851-…"). Nomor lain (telepon kantor, luar negeri) ditampilkan seperti yang ditulis admin.
 */
export const displayPhone = (raw: string): string => {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  const local = digits.startsWith('628') ? `0${digits.slice(2)}` : digits;
  if (!local.startsWith('08') || local.length < 10 || local.length > 13) return trimmed;
  return [local.slice(0, 4), local.slice(4, 8), local.slice(8)].join('-');
};

/** Tautan `tel:` berkode negara agar bisa dipanggil dari luar negeri: "085188009152" → "tel:+6285188009152". */
export const telHref = (raw: string): string => {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';
  if (trimmed.startsWith('+') || digits.startsWith('62')) return `tel:+${digits}`;
  return `tel:+62${digits.replace(/^0/, '')}`;
};

/**
 * Isi harga template (keputusan pemilik 2026-10-21, diubah 2026-10-25: domain TIDAK lagi termasuk): template + setup,
 * hosting dan SSL tahun pertama. Domain dipilih dan dibayar saat memesan (harga per ekstensi di src/lib/domainPricing.ts);
 * mulai tahun ke-2 perpanjangan = hosting & jasa (setting template_hosting_renewal_price) + domain sesuai ekstensi.
 * Admin bisa mengubah teksnya di Pengaturan website > Harga.
 */
export const TEMPLATE_PRICE_INCLUDES_DEFAULT: readonly string[] = [
  'Template website + setup awal',
  'Hosting tahun pertama',
  'Sertifikat SSL (HTTPS) tahun pertama',
];
export const TEMPLATE_PRICE_NOTE_DEFAULT = `Domain dipilih saat memesan, mulai ${rupiahCompact(DOMAIN_PRICE_FROM)}/tahun. Mulai tahun ke-2, hosting & jasa serta domain diperpanjang per tahun lewat Akun Saya.`;

export interface TemplatePricing {
  /** Daftar "Sudah termasuk" (kosong = jangan tampilkan daftarnya). */
  includes: string[];
  /** Catatan satu kalimat di bawah harga (kosong = jangan tampilkan barisnya). */
  note: string;
}

/**
 * Catatan harga template dari setting `template_price_includes` (satu item per baris, awalan "-"/"•" dibuang) dan
 * `template_price_note`. Setting yang belum pernah disimpan memakai teks bawaan di atas; setting yang sengaja
 * dikosongkan admin menyembunyikan barisnya.
 */
export const getTemplatePricing = (settings: SiteSettings): TemplatePricing => {
  const rawIncludes = settings.template_price_includes;
  const includes =
    rawIncludes === undefined
      ? [...TEMPLATE_PRICE_INCLUDES_DEFAULT]
      : rawIncludes
          .split(/\r?\n/)
          .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
          .filter(Boolean);
  const note = settings.template_price_note === undefined ? TEMPLATE_PRICE_NOTE_DEFAULT : settings.template_price_note.trim();
  return { includes, note };
};

/** `getTemplatePricing` + status muat setting, untuk halaman detail template, pemesanan, dan akun. */
export const useTemplatePricing = (): TemplatePricing & { loaded: boolean } => {
  const { settings, loaded } = useSiteSettings();
  return { ...getTemplatePricing(settings), loaded };
};

/**
 * Biaya hosting & jasa per tahun mulai tahun ke-2 dari setting `template_hosting_renewal_price` (kosong/tidak valid →
 * bawaan Rp500.000, sama dengan backend). Perpanjangan domain dihitung terpisah sesuai ekstensi (domainPricing.ts).
 */
export const useHostingRenewalPrice = (): { price: number; loaded: boolean } => {
  const { settings, loaded } = useSiteSettings();
  return { price: hostingRenewalPrice(settings), loaded };
};

// eslint-disable-next-line no-control-regex -- karakter trim() PHP, persis seperti backend
const PHP_TRIM = /^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g;

/**
 * Harga fitur tambahan Berita & Pengumuman (template sekolah, sekali bayar) dari setting `addon_posts_price`: angka rupiah
 * utuh > 0; kosong, tidak valid, atau 0 → bawaan Rp350.000. Sama dengan sa_price di backend (SITE-ADDONS-SPEC.md §1):
 * trim ala PHP (hanya spasi, \t, \n, \r, \0, \x0B), lalu dibulatkan dari teksnya (digit desimal pertama ≥ 5 → naik).
 */
export const addonPostsPrice = (settings: SiteSettings): number => {
  const raw = String(settings[ADDON_POSTS_PRICE_SETTING] ?? '').replace(PHP_TRIM, '');
  const m = /^(\d+)(?:\.(\d)\d*)?$/.exec(raw);
  if (!m) return ADDON_POSTS_PRICE_DEFAULT;
  const whole = m[1].replace(/^0+/, '');
  if (whole.length > 13) return ADDON_POSTS_PRICE_DEFAULT;
  const value = Number(whole || '0') + (m[2] !== undefined && m[2] >= '5' ? 1 : 0);
  return value > 0 && value <= 1e12 ? value : ADDON_POSTS_PRICE_DEFAULT;
};
