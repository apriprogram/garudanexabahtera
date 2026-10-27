// Fitur tambahan berbayar per situs (docs/platform/SITE-ADDONS-SPEC.md §4–5): aksi API pembeli, nomor tagihan dari URL
// kembali Midtrans, alamat menu Fitur tambahan dan nota, serta keadaan terkunci Berita & Pengumuman di panel situs.
// Pola sama dengan perpanjangan (renewal.ts).
import { apiGet, apiPost } from '../../../lib/api';
import { demoPath } from '../../../seo/paths';
import type { Site } from '../../../types/platform';
import {
  ADDON_NUMBER_PREFIX,
  type SiteAddonCode,
  type SiteAddonOrder,
  type SiteAddonsResponse,
  type SiteAddonSite,
  type SiteAddonState,
} from '../../../types/siteAddons';
import { hasPostsFeature } from '../posts/siteLinks';
import { goToPayment, isPaymentUrl } from './payment';
import { orderInvoicePath } from './renewal';

/** Menu Fitur tambahan; `?situs=ID` menggulir & memfokuskan baris situs itu. */
export const ADDONS_PATH = '/akun/fitur';

export const addonsPath = (siteId?: number | null) => (siteId ? `${ADDONS_PATH}?situs=${siteId}` : ADDONS_PATH);

/** Id baris situs di halaman Fitur tambahan (tujuan ?situs=ID). */
export const addonRowId = (siteId: number) => `situs-${siteId}`;

/**
 * Demo template dengan tampilan berita profesional (SITE-ADDONS-SPEC §6). /demo/:slug memakai slug katalog; untuk
 * template sekolah (madani, cakrawala, bestari) slug = kode templatenya (migrasi 024/025/028).
 */
export const addonDemoPath = (templateCode: string) => `${demoPath(encodeURIComponent(templateCode))}?fitur=berita`;

/** Nomor dokumen di rute nota berawalan GNF- = nota fitur tambahan (GNR- = perpanjangan). */
export const isAddonNumber = (doc: string | null | undefined): boolean => (doc ?? '').trim().toUpperCase().startsWith(ADDON_NUMBER_PREFIX);

/** Nota fitur tambahan: /akun/pesanan/:orderNumber/nota/:addonNumber. */
export const addonInvoicePath = (orderNumber: string, addonNumber: string) =>
  `${orderInvoicePath(orderNumber)}/${encodeURIComponent(addonNumber)}`;

/**
 * order_id dari URL kembali Midtrans → nomor tagihan fitur: `GNF-20261027-AB12CD-2` → `GNF-20261027-AB12CD`.
 * Bukan tagihan fitur (mis. `GN-…`, `GNR-…`) → null.
 */
export function addonNumberFromReturn(orderId: string | null | undefined): string | null {
  const id = (orderId ?? '').trim().toUpperCase();
  if (!id.startsWith(ADDON_NUMBER_PREFIX)) return null;
  const match = /^(GNF-\d{8}-[A-Z0-9]+)(?:-\d+)?$/.exec(id);
  return match ? match[1] : null;
}

/** Keadaan fitur Berita & Pengumuman satu situs, hanya bila templatenya mampu. */
export const postsAddonOf = (site: SiteAddonSite): SiteAddonState | null =>
  site.addons.find((addon) => addon.code === 'posts' && addon.capable) ?? null;

/**
 * Berita & Pengumuman terkunci untuk situs ini: template mampu tetapi fitur belum aktif. Respons lama tanpa `addons`
 * dianggap tidak terkunci (server tetap menjawab POSTS_LOCKED bila memang terkunci).
 */
export function postsLocked(site: Pick<Site, 'template_code' | 'addons' | 'posts_capable'>): boolean {
  const capable = site.posts_capable ?? hasPostsFeature(site.template_code);
  return capable && site.addons !== undefined && site.addons !== null && !site.addons.posts;
}

/* ─────────────────────────── Aksi API ─────────────────────────── */

/** Semua situs pembeli dengan keadaan fiturnya, terbaru dulu. */
export const fetchSiteAddons = () => apiGet<SiteAddonsResponse>('customer_get_site_addons');

export interface BuyAddonResult {
  addon_order: SiteAddonOrder;
  /** Link Snap Midtrans; null bila pembayaran online belum dikonfigurasi atau gagal dibuat */
  payment_url: string | null;
  payment_error?: string | null;
}

/** Buat tagihan fitur. Melempar ApiError (ADDON_ACTIVE, ADDON_PENDING, ADDON_UNAVAILABLE, SITE_SUSPENDED, …). */
export const buySiteAddon = (siteId: number, addon: SiteAddonCode) =>
  apiPost<BuyAddonResult>('customer_buy_site_addon', { site_id: siteId, addon });

/** Minta link pembayaran tagihan fitur lalu arahkan ke Midtrans. Melempar ApiError bila gagal (PAYMENT_UNDER_REVIEW, …). */
export async function paySiteAddon(addonNumber: string): Promise<void> {
  const res = await apiPost<{ payment_url: string | null }>('customer_pay_site_addon', { addon_number: addonNumber });
  if (!isPaymentUrl(res.payment_url)) {
    throw new Error('Link pembayaran belum tersedia. Silakan coba lagi beberapa saat lagi.');
  }
  goToPayment(res.payment_url);
}

export const cancelSiteAddon = (addonNumber: string) =>
  apiPost<{ addon_order: SiteAddonOrder }>('customer_cancel_site_addon', { addon_number: addonNumber });

/** Hanya bila get_payment_config.simulator (lokal/uji). */
export const simulateSiteAddonPayment = (addonNumber: string) =>
  apiPost<{ addon_order: SiteAddonOrder; site?: SiteAddonSite }>('dev_simulate_site_addon_payment', { addon_number: addonNumber });
