// Hitungan kunjungan + sumbernya (docs/platform/SEO-PLAN.md §5.9 langkah 2). Sekali per sesi browser, hanya di host
// utama (situs pembeli tidak dihitung di statistik Garuda Nexa). Yang dikirim ke track_visit hanya:
//   referrer_host  host dari document.referrer (bukan URL lengkap; kosong bila dari halaman Garuda Nexa sendiri)
//   landing_path   path halaman pertama sesi, tanpa query string
//   utm_source     utm_source halaman itu saja (ChatGPT menambahkan utm_source=chatgpt.com)
// Server memvalidasi dan memotong lagi (backend/modules/visits.php / visits.js), jadi di sini cukup ringkas.
import { isMainHost } from '../templates/siteHosts';

const SESSION_KEY = 'hasVisited';
const UTM_MAX = 100;

export interface VisitSource {
  referrer_host: string | null;
  landing_path: string;
  utm_source: string | null;
}

/** Host referrer, atau null bila kosong, tidak bisa dibaca, atau milik Garuda Nexa sendiri (navigasi internal). */
export function referrerHostOf(referrer: string): string | null {
  if (!referrer) return null;
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host || isMainHost(host)) return null;
  return host;
}

/** Data sumber kunjungan dari lokasi halaman pertama dan document.referrer. */
export function visitSourceOf(location: Pick<Location, 'pathname' | 'search'>, referrer: string): VisitSource {
  const utm = new URLSearchParams(location.search).get('utm_source');
  return { referrer_host: referrerHostOf(referrer), landing_path: location.pathname || '/', utm_source: utm?.trim().slice(0, UTM_MAX) || null };
}

/** Sudah dihitung di sesi ini? Menandai sesi sekaligus; penyimpanan diblokir = anggap belum (hitung sekali per muat). */
function firstVisitInSession(): boolean {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    sessionStorage.setItem(SESSION_KEY, 'true');
  } catch {
    // sessionStorage tidak tersedia (mode privat ketat): tetap hitung
  }
  return true;
}

/**
 * Catat kunjungan sekali per sesi. Tanda sesi dipasang sebelum request, jadi StrictMode (effect dua kali) tidak
 * menghitung dua kali. Gagal kirim tidak mengganggu halaman.
 */
export function trackVisitOnce(): void {
  if (typeof window === 'undefined' || !isMainHost(window.location.hostname)) return;
  if (!firstVisitInSession()) return;
  const body = { action: 'track_visit', ...visitSourceOf(window.location, document.referrer) };
  // Statistik saja: gagal (jaringan, atau fetch yang melempar langsung) tidak perlu diketahui pengunjung
  try {
    fetch('/api.php?action=track_visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // diabaikan, lihat di atas
  }
}
