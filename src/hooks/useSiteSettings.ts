import { useCachedJson } from './useCachedJson';

/** Isi tabel hero_settings dari /api.php?action=get_settings (semua nilai berupa string). */
export type SiteSettings = Record<string, string | undefined>;

const ENDPOINT = '/api.php?action=get_settings';
const DEFAULT_WHATSAPP = '6285188009152';
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

/** Nomor WhatsApp (hanya angka) dari setting footer. */
export const getWhatsappNumber = (settings: SiteSettings): string =>
  (settings.footer_whatsapp || '').replace(/\D/g, '') || DEFAULT_WHATSAPP;

export const whatsappUrl = (number: string, message?: string): string =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
