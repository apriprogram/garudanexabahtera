// ?v=<hash> untuk gambar publik yang URL-nya tetap: kartu OG (/og/*.jpg) dan pratinjau/galeri template
// (/assets/templates/*). Cloudflare menyimpan gambar 30 hari per URL, jadi tanpa versi gambar yang diganti dengan nama
// sama tetap tampil versi lama. Hash = isi berkas saat build (scripts/asset-versions.mjs → virtual:gn-asset-versions).
//
// Hanya untuk TAMPILAN (img, head, JSON-LD, sitemap). Nilai di DB tetap tanpa versi: data admin (admin_get_templates)
// tidak pernah lewat sini, karena admin_save_template membandingkan path lama/baru apa adanya untuk menghapus berkas.
// Aturan yang sama ada di backend/seo.php (seo_versioned_asset) dengan peta dari _pre/seo-fallback.json.
import versions from 'virtual:gn-asset-versions';
import { SITE_ORIGIN } from './paths';

/** Peta path publik → versi (untuk prerender → seo-fallback.json dan tes). */
export const ASSET_VERSIONS: Readonly<Record<string, string>> = versions;

/**
 * "/og/harga.jpg" → "/og/harga.jpg?v=1a2b3c4d"; URL absolut garudanexa.com juga. Tidak berubah bila berkas tidak ada di
 * peta (unggahan admin, URL luar, svg di subfolder), bila sudah ber-query/hash (idempoten), atau bila kosong.
 */
export function versionedAsset(src: string): string {
  const value = src.trim();
  if (!value || /[?#]/.test(value)) return value;
  const path = value.startsWith(`${SITE_ORIGIN}/`) ? value.slice(SITE_ORIGIN.length) : value;
  if (!path.startsWith('/') || path.startsWith('//')) return value;
  const version = ASSET_VERSIONS[path];
  return version ? `${value}?v=${version}` : value;
}

/** Template dari API publik dengan preview_image & gallery berversi (objek baru; aslinya tidak diubah). */
export function versionTemplateImages<T>(template: T): T {
  if (!template || typeof template !== 'object') return template;
  const t = template as Record<string, unknown>;
  const next: Record<string, unknown> = { ...t };
  if (typeof t.preview_image === 'string') next.preview_image = versionedAsset(t.preview_image);
  if (Array.isArray(t.gallery)) next.gallery = t.gallery.map((src) => (typeof src === 'string' ? versionedAsset(src) : src));
  return next as T;
}

/** Aksi API publik yang isinya template (pratinjau & galeri ikut diberi versi). */
const TEMPLATE_ACTIONS = new Set(['get_templates', 'get_template']);

/**
 * Respons `get_templates` ({templates}) / `get_template` ({template}) dengan gambar berversi; aksi lain apa adanya.
 * Hasil di-cache per objek respons, jadi pemanggil berulang (peekApiGet) mendapat objek yang sama.
 */
const versionedBodies = new WeakMap<object, unknown>();
export function versionTemplateResponse<T>(action: string, body: T): T {
  if (!TEMPLATE_ACTIONS.has(action) || !body || typeof body !== 'object') return body;
  const cached = versionedBodies.get(body);
  if (cached) return cached as T;
  const b = body as Record<string, unknown>;
  const next: Record<string, unknown> = { ...b };
  if (Array.isArray(b.templates)) next.templates = b.templates.map(versionTemplateImages);
  if (b.template && typeof b.template === 'object') next.template = versionTemplateImages(b.template);
  versionedBodies.set(body, next);
  return next as T;
}
