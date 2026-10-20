// Host utama aplikasi Garuda Nexa. Host lain dianggap domain situs pembeli (SiteHostGate).
// Atur lewat VITE_MAIN_HOSTS (dipisah koma) saat build.

const DEFAULT_MAIN_HOSTS = 'localhost,127.0.0.1,garudanexa.com,www.garudanexa.com,garudanexabahtera.web.id';

export const MAIN_HOSTS: string[] = String(import.meta.env.VITE_MAIN_HOSTS || DEFAULT_MAIN_HOSTS)
  .split(',')
  .map((host) => host.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[:/].*$/, ''))
  .filter(Boolean);

const normalize = (hostname: string) => hostname.trim().toLowerCase().replace(/\.$/, '');

/**
 * true = tampilkan aplikasi utama. Selain daftar MAIN_HOSTS, alamat IP (uji dari HP di jaringan lokal), IPv6,
 * dan "www." dari host utama juga dianggap host utama. Untuk menguji situs pembeli secara lokal pakai
 * subdomain .localhost, mis. http://tokoku.localhost:5173 (domain situs di DB = "tokoku.localhost").
 */
export function isMainHost(hostname: string): boolean {
  const host = normalize(hostname);
  if (!host) return true;
  if (MAIN_HOSTS.includes(host)) return true;
  if (host.startsWith('www.') && MAIN_HOSTS.includes(host.slice(4))) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':') || host.startsWith('[')) return true;
  return false;
}

/** URL website Garuda Nexa (host utama publik pertama), untuk tautan "Didukung oleh". */
export function mainSiteUrl(): string {
  const host = MAIN_HOSTS.find((h) => h.includes('.') && !/^\d{1,3}(\.\d{1,3}){3}$/.test(h) && !h.endsWith('.localhost'));
  return host ? `https://${host}` : '/';
}
