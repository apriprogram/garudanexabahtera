// Fitur tambahan berbayar per situs pembeli (saat ini: Berita & Pengumuman untuk template sekolah).
// Kontrak lengkap: docs/platform/SITE-ADDONS-SPEC.md. Bentuk respons PHP (backend/modules/site_addons.php) dan Node
// (site_addons.js) harus sama persis dengan tipe di file ini.

export type SiteAddonCode = 'posts';
export type SiteAddonStatus = 'menunggu_pembayaran' | 'lunas' | 'dibatalkan';
/** beli = dibayar pembeli; admin = diaktifkan gratis oleh staf; migrasi = sudah memakai berita sebelum fitur berbayar */
export type SiteAddonSource = 'beli' | 'admin' | 'migrasi';

export const SITE_ADDON_STATUS_LABEL: Record<SiteAddonStatus, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  lunas: 'Lunas',
  dibatalkan: 'Dibatalkan',
};

/** Nama tampilan per kode fitur (sama dengan backend). */
export const SITE_ADDON_NAME: Record<SiteAddonCode, string> = {
  posts: 'Berita & Pengumuman',
};

/** Setting harga (hero_settings) dan harga bawaan bila kosong/tidak valid/0. Sekali bayar. */
export const ADDON_POSTS_PRICE_SETTING = 'addon_posts_price';
export const ADDON_POSTS_PRICE_DEFAULT = 350000;

/** Awalan nomor tagihan fitur tambahan (order id Midtrans = `{addon_number}-{percobaan}`). */
export const ADDON_NUMBER_PREFIX = 'GNF-';

/** Satu tagihan/aktivasi fitur (baris site_addon_orders). */
export interface SiteAddonOrder {
  addon_number: string;
  site_id: number;
  order_number: string;
  addon_code: SiteAddonCode;
  price: number;
  status: SiteAddonStatus;
  status_label: string;
  source: SiteAddonSource;
  payment_status: string;
  payment_type: string | null;
  payment_url: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  revoked_at: string | null;
  created_at: string;
  /** INV-{addon_number} untuk tagihan lunas berbayar; null untuk hadiah admin/migrasi atau belum lunas */
  invoice_number: string | null;
}

/** Keadaan satu fitur untuk satu situs. */
export interface SiteAddonState {
  code: SiteAddonCode;
  name: string;
  price: number;
  /** Template situs mendukung fitur ini (template sekolah) */
  capable: boolean;
  active: boolean;
  activated_at: string | null;
  source: SiteAddonSource | null;
  /** Baris lunas aktif terbaru */
  purchase: SiteAddonOrder | null;
  /** Tagihan yang menunggu pembayaran */
  pending: SiteAddonOrder | null;
}

/** Situs milik pembeli dengan keadaan fiturnya (customer_get_site_addons). */
export interface SiteAddonSite {
  site_id: number;
  domain: string;
  template_code: string;
  template_name: string;
  order_number: string;
  site_status: string;
  addons: SiteAddonState[];
}

export interface SiteAddonsResponse {
  sites: SiteAddonSite[];
  price: Record<SiteAddonCode, number>;
}

/** Flag fitur di get_site_public / customer_get_site (true = template mampu dan fitur aktif). */
export interface SiteAddonFlags {
  posts: boolean;
}
