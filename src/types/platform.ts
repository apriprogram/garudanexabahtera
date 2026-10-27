// Tipe data marketplace template & jasa custom. Kontrak lengkap: docs/platform/SPEC.md §6.
// File bersama: jangan ubah bentuknya tanpa menyesuaikan SPEC dan kedua backend.
import type { SiteAddonFlags } from './siteAddons';

export type OrderStatus =
  | 'menunggu_pembayaran'
  | 'menunggu_approval'
  | 'proses_domain'
  | 'aktif'
  | 'ditolak'
  | 'dibatalkan';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  menunggu_approval: 'Dibayar (Menunggu Approval)',
  proses_domain: 'Disetujui (Proses Domain)',
  aktif: 'Aktif',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
};

/** Urutan alur normal, untuk timeline status. */
export const ORDER_FLOW: OrderStatus[] = ['menunggu_pembayaran', 'menunggu_approval', 'proses_domain', 'aktif'];

/** Nada warna pill per status (dipetakan ke komponen Badge masing-masing area). */
export const ORDER_STATUS_TONE: Record<OrderStatus, 'warning' | 'brand' | 'info' | 'success' | 'danger' | 'neutral'> = {
  menunggu_pembayaran: 'warning',
  menunggu_approval: 'brand',
  proses_domain: 'info',
  aktif: 'success',
  ditolak: 'danger',
  dibatalkan: 'neutral',
};

/** transaction_status Midtrans → label Indonesia. */
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu pembayaran',
  settlement: 'Lunas',
  capture: 'Lunas',
  deny: 'Ditolak bank',
  cancel: 'Dibatalkan',
  expire: 'Kedaluwarsa',
  failure: 'Gagal',
  refund: 'Dikembalikan',
  partial_refund: 'Dikembalikan sebagian',
  simulated: 'Lunas (simulasi)',
};

export type TemplateStatus = 'draft' | 'published';

export interface Template {
  id: number;
  slug: string;
  name: string;
  category: string;
  short_description: string | null;
  description: string | null;
  features: string[];
  price: number;
  preview_image: string | null;
  gallery: string[];
  template_code: string;
  demo_url: string | null;
  status: TemplateStatus;
  sort_order: number;
  /** Jumlah suka & dilihat di kartu katalog (migrasi 013); tidak ada di data lama = 0. */
  like_count?: number;
  view_count?: number;
  /** Pesanan yang sudah dibayar & tidak dibatalkan/ditolak (dihitung server di daftar & detail publik). */
  sold_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderUser {
  id: number;
  name: string;
  email: string;
}

export interface Order {
  id: number;
  order_number: string;
  template_id: number | null;
  template_name: string;
  template_code: string;
  template_slug: string | null;
  /** Harga yang dibayar (setelah diskon pembelian pertama bila ada). */
  price: number;
  /** Harga katalog saat dipesan; = price untuk pesanan tanpa diskon / dari sebelum migrasi 012. */
  list_price?: number;
  /** Potongan diskon pembelian pertama (0 = tanpa diskon). */
  discount_amount?: number;
  discount_code?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string | null;
  notes: string | null;
  domain_primary: string;
  domain_alternative: string | null;
  domain: string | null;
  status: OrderStatus;
  status_label: string;
  payment_status: string;
  payment_type: string | null;
  payment_url: string | null;
  paid_at: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  site_id: number | null;
  /**
   * Harga domain tahun pertama yang ikut dibayar (sudah termasuk di `price`); 0 = pesanan dari sebelum domain dijual
   * terpisah (migrasi 026). Docs: ACCOUNT-DOMAIN-RENEWAL-SPEC.md.
   */
  domain_price?: number;
  /** Hasil cek ketersediaan domain saat dipesan ('available' | 'unknown'), null untuk pesanan lama. */
  domain_check?: string | null;
  /** "INV-" + order_number setelah dibayar, null sebelumnya. */
  invoice_number?: string | null;
  /** Masa aktif hosting & jasa template dan domain (mulai saat situs aktif, bertambah saat diperpanjang). */
  service_started_at?: string | null;
  service_expires_at?: string | null;
  domain_started_at?: string | null;
  domain_expires_at?: string | null;
  /** Hanya untuk staf */
  user?: OrderUser;
}

export type RenewalStatus = 'menunggu_pembayaran' | 'lunas' | 'dibatalkan';

export const RENEWAL_STATUS_LABEL: Record<RenewalStatus, string> = {
  menunggu_pembayaran: 'Menunggu Pembayaran',
  lunas: 'Lunas',
  dibatalkan: 'Dibatalkan',
};

/** Tagihan perpanjangan masa aktif (hosting & jasa + domain) untuk 1–3 tahun. */
export interface Renewal {
  id: number;
  renewal_number: string;
  order_number: string;
  domain: string;
  years: number;
  hosting_price_per_year: number;
  domain_price_per_year: number;
  price_per_year: number;
  /** Jumlah yang dibayar = years × price_per_year */
  price: number;
  status: RenewalStatus;
  status_label: string;
  payment_status: string;
  payment_type: string | null;
  /** Hanya pemilik, dan hanya selama menunggu pembayaran */
  payment_url: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  service_expires_before: string | null;
  service_expires_after: string | null;
  domain_expires_before: string | null;
  domain_expires_after: string | null;
  /** "INV-" + renewal_number setelah lunas */
  invoice_number: string | null;
  created_at: string;
}

/** Penawaran perpanjangan untuk pesanan (customer_get_order). Tanggal berakhir baru dihitung database. */
export interface RenewalOffer {
  available: boolean;
  /** Alasan tidak tersedia (kalimat untuk pembeli), null bila tersedia */
  reason: string | null;
  hosting_price_per_year: number;
  domain_price_per_year: number | null;
  price_per_year: number | null;
  max_years: number;
  options: { years: number; price: number; service_expires_after: string; domain_expires_after: string }[];
}

/** Satu baris daftar nota pembeli (customer_get_invoices, menu Nota di /akun). */
export interface CustomerInvoiceItem {
  /** fitur = fitur tambahan berbayar (docs/platform/SITE-ADDONS-SPEC.md §4.3) */
  type: 'pembelian' | 'perpanjangan' | 'fitur';
  invoice_number: string;
  order_number: string;
  renewal_number: string | null;
  /** Nomor tagihan fitur tambahan (GNF-…), hanya untuk type 'fitur'; tidak ada di respons lama */
  addon_number?: string | null;
  /** Nama template pesanan; "Fitur Berita & Pengumuman" untuk type 'fitur' */
  title: string;
  domain: string;
  /** Lama perpanjangan (tahun); null untuk nota pembelian */
  years: number | null;
  amount: number;
  paid_at: string;
  payment_status: string;
  payment_type: string | null;
  /** Status pesanan (nota pembelian saja; ditolak = dana dikembalikan) */
  order_status: OrderStatus | null;
}

/** Hasil customer_check_domain. */
export interface DomainCheck {
  domain: string;
  tld: string;
  status: 'available' | 'taken' | 'unknown';
  price: number;
}

/** Biodata akun pembeli (customer_get_profile / customer_update_profile). */
export interface CustomerProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company_name: string | null;
  address: string | null;
  city: string | null;
  /** Path/URL foto profil, null = inisial nama */
  avatar: string | null;
}

export interface OrderLog {
  id: number;
  event: string;
  from_status: string | null;
  to_status: string | null;
  actor_type: 'system' | 'customer' | 'staff' | 'midtrans';
  actor_name: string | null;
  note: string | null;
  created_at: string;
}

export type SiteStatus = 'active' | 'suspended';

export interface Site {
  id: number;
  order_id: number;
  order_number: string;
  user_id: number;
  template_id: number | null;
  template_code: string;
  template_name: string;
  domain: string;
  status: SiteStatus;
  /** SiteContent (lihat src/templates/types.ts); null = pakai konten default template */
  content: Record<string, unknown> | null;
  activated_at: string | null;
  updated_at: string;
  /** Masa aktif pesanan induk (hosting & jasa, domain); null sebelum migrasi 026 diisi */
  service_expires_at?: string | null;
  domain_expires_at?: string | null;
  /** Fitur tambahan yang aktif (customer_get_site, SITE-ADDONS-SPEC §3); tidak ada di respons lama */
  addons?: SiteAddonFlags;
  /** Template situs mendukung berita & pengumuman (template sekolah); tidak ada di respons lama */
  posts_capable?: boolean;
  /** Hanya untuk staf */
  owner_name?: string;
  owner_email?: string;
}

export interface PublicProject {
  id: number;
  name: string;
  service_type: string;
  image: string | null;
  description: string | null;
}

export interface PaymentConfig {
  configured: boolean;
  is_production: boolean;
  simulator: boolean;
  client_key: string | null;
}

export interface DashboardSummary {
  template_orders: { total: number; this_month: number; by_status: Partial<Record<OrderStatus, number>> };
  custom_projects: { total: number; this_month: number; from_website_pending: number };
  revenue: { template_paid: number; custom_total: number };
  recent_template_orders: Order[];
}

/** Format rupiah: 1500000 → "Rp 1.500.000" */
export const formatRupiah = (value: number | string | null | undefined) =>
  `Rp ${Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;

/** Format tanggal Indonesia; kosong → "-" */
export const formatTanggal = (value: string | null | undefined, withTime = false) => {
  if (!value) return '-';
  const d = new Date(value.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('id-ID', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'long', year: 'numeric' });
};
