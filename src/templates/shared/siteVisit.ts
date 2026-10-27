// Pencatatan kunjungan situs pembeli (docs/platform/SITE-STATS-SPEC.md §2, klien). Dipanggil CustomerSite saja (domain
// pembeli), sekali per rute yang tampil; SitePreview, demo, dan pratinjau CMS tidak memanggilnya. Server yang memutuskan
// dihitung atau tidak (Origin harus domain situs, path harus rute yang tampil di situs itu, bukan perayap, batas laju)
// dan selalu menjawab {success: true}, jadi jawabannya tidak dibaca. Yang dikirim hanya: id situs, path halaman,
// document.referrer, utm_source halaman pertama, dan `first` (halaman pertama sesi browser). Tanpa cookie; penanda sesi
// di sessionStorage.
import type { SiteVisitInput } from '../../types/siteStats';

/** Penanda sesi: ada = halaman berikutnya di sesi browser ini bukan halaman pertama lagi. */
export const SITE_VISIT_SESSION_KEY = 'gn-site-visit';
const UTM_MAX = 100;

/** sessionStorage diblokir (mode privat ketat): halaman pertama dihitung sekali per muat halaman. */
let firstInMemory = true;

/** Kosongkan penanda cadangan di memori (untuk tes). */
export const resetSiteVisit = () => {
  firstInMemory = true;
};

/** Halaman pertama sesi browser ini? Menandai sesi sekaligus, jadi panggilan berikutnya = false. */
export function takeFirstVisit(): boolean {
  try {
    if (window.sessionStorage.getItem(SITE_VISIT_SESSION_KEY)) return false;
    window.sessionStorage.setItem(SITE_VISIT_SESSION_KEY, '1');
    return true;
  } catch {
    const first = firstInMemory;
    firstInMemory = false;
    return first;
  }
}

/** utm_source dari query halaman ("?utm_source=instagram" → "instagram"); tidak ada → "". Server merapikan lagi. */
export const utmSourceOf = (search: string): string => {
  try {
    return new URLSearchParams(search).get('utm_source')?.trim().slice(0, UTM_MAX) ?? '';
  } catch {
    return '';
  }
};

/**
 * Kirim satu tampilan halaman (aksi publik site_visit). `keepalive`: tetap terkirim walau pengunjung langsung menutup
 * tab. Gagal (jaringan, fetch yang melempar langsung) diabaikan: statistik tidak boleh mengganggu situs.
 */
export function sendSiteVisit(visit: Omit<SiteVisitInput, 'first' | 'referrer'>): void {
  const body: SiteVisitInput & { action: string } = {
    action: 'site_visit',
    site_id: visit.site_id,
    path: visit.path,
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    utm_source: visit.utm_source,
    first: takeFirstVisit(),
  };
  try {
    fetch('/api.php?action=site_visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // diabaikan, lihat di atas
  }
}
