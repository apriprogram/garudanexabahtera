// Tipe data marketplace template & jasa custom. Kontrak lengkap: docs/platform/SPEC.md §6.
// File bersama: jangan ubah bentuknya tanpa menyesuaikan SPEC dan kedua backend.

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
  /** Hanya untuk staf */
  user?: OrderUser;
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
