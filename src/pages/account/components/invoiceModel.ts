// Nota resmi pembelian template, perpanjangan masa aktif (docs/platform/ACCOUNT-DOMAIN-RENEWAL-SPEC.md §6), dan fitur
// tambahan (SITE-ADDONS-SPEC.md §4.3): data customer_get_invoice → DocModel mesin dokumen proyek, jadi pratinjau A4,
// cetak, dan PDF memakai kop, tipografi, dan "Halaman x dari y" yang sama dengan dokumen proyek. Murni: tanpa DOM dan
// tanpa I/O.
import { formatRupiahDoc, tanggalPanjang, terbilang, type Block, type DocModel, type TextRun } from '../../../features/project-docs/engine';
import type { CompanySettings } from '../../../features/project-docs/types';
import { invoiceNumberFor } from '../../../lib/domainPricing';
import { RENEWAL_STATUS_LABEL, type Order, type Renewal } from '../../../types/platform';
import { SITE_ADDON_NAME, SITE_ADDON_STATUS_LABEL, type SiteAddonOrder } from '../../../types/siteAddons';
import { invoiceStatus, isRefunded, paymentStatusLabel, paymentTypeLabel, type PaymentTone } from './paymentStatus';

/** Respons customer_get_invoice. */
export interface InvoiceData {
  order: Order;
  /** null = nota pembelian; terisi = nota perpanjangan. Tidak ada di respons nota fitur tambahan. */
  renewal?: Renewal | null;
  /** Terisi = nota fitur tambahan (permintaan dengan addon_number GNF-…) */
  addon?: SiteAddonOrder | null;
  /** Identitas perusahaan untuk kop (pd_settings.company) */
  company: CompanySettings;
}

type KeyValueRow = Extract<Block, { type: 'keyValue' }>['rows'][number];
type Item = [label: string, amount: number];

const EMPTY_COMPANY: CompanySettings = {
  name: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  website: '',
  npwp: '',
  signatory_name: '',
  signatory_title: '',
  bank_accounts: [],
};

/** Pembayaran yang tidak lewat Midtrans (pesanan gratis, simulator lokal): kalimat Midtrans di penutup tidak dipakai. */
const NOT_MIDTRANS = new Set(['gratis', 'simulator']);

const num = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
const plain = (text: string): TextRun[] => [{ text }];
const row = (label: string, value: string | TextRun[]): KeyValueRow => ({ label, value: typeof value === 'string' ? plain(value) : value });
const heading = (text: string): Block => ({ type: 'heading', level: 2, text });

/** 'YYYY-MM-DD[ HH:MM:SS]' → "23 Oktober 2026"; '-' bila kosong/tidak valid. */
const tanggal = (value: string | null | undefined) => tanggalPanjang(value ?? '') || '-';

/** Waktu database (WIB) '2026-10-23 14:05:00' → "23 Oktober 2026 pukul 14.05 WIB"; '-' bila kosong. */
export function waktuBayar(value: string | null | undefined): string {
  const date = tanggalPanjang(value ?? '');
  if (!date) return '-';
  const time = /[T ](\d{2}):(\d{2})/.exec(value ?? '');
  return time ? `${date} pukul ${time[1]}.${time[2]} WIB` : date;
}

/** 'YYYY-MM-DD…' + n tahun → 'YYYY-MM-DD'; 29 Februari jatuh ke 28 Februari (sama dengan DATE_ADD MySQL). */
export function tambahTahun(value: string, years: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!m || !tanggalPanjang(value)) return '';
  const year = Number(m[1]) + years;
  const lastDay = new Date(Date.UTC(year, Number(m[2]), 0)).getUTCDate();
  return `${year}-${m[2]}-${String(Math.min(Number(m[3]), lastDay)).padStart(2, '0')}`;
}

/** Nomor nota: dari server bila ada, selain itu "INV-" + nomor pesanan/perpanjangan/tagihan fitur (aturan yang sama). */
export const invoiceNumberOf = (order: Order, renewal: Renewal | null | undefined, addon?: SiteAddonOrder | null): string =>
  addon
    ? addon.invoice_number || invoiceNumberFor(addon.addon_number)
    : renewal
      ? renewal.invoice_number || invoiceNumberFor(renewal.renewal_number)
      : order.invoice_number || invoiceNumberFor(order.order_number);

/** Nama file unduhan: "Nota-INV-GN-20261023-DCZ03O.pdf". */
export const invoiceFileName = (number: string) => `Nota-${number}.pdf`;

/** Status pembayaran perpanjangan dengan kata-kata yang sama seperti pesanan ("Lunas (simulasi)", "Dikembalikan"). */
function renewalPaymentStatus(renewal: Renewal): { label: string; tone: PaymentTone } {
  if (isRefunded(renewal)) return { label: paymentStatusLabel(renewal.payment_status), tone: 'neutral' };
  if (renewal.status === 'lunas') {
    return { label: paymentStatusLabel(renewal.payment_status === 'simulated' ? 'simulated' : 'settlement'), tone: 'success' };
  }
  return { label: renewal.status_label || RENEWAL_STATUS_LABEL[renewal.status] || renewal.status, tone: 'warning' };
}

/** Status pembayaran tagihan fitur tambahan, sama seperti perpanjangan ("Lunas", "Lunas (simulasi)", "Dikembalikan"). */
function addonPaymentStatus(addon: SiteAddonOrder): { label: string; tone: PaymentTone } {
  if (isRefunded(addon)) return { label: paymentStatusLabel(addon.payment_status), tone: 'neutral' };
  if (addon.status === 'lunas') {
    return { label: paymentStatusLabel(addon.payment_status === 'simulated' ? 'simulated' : 'settlement'), tone: 'success' };
  }
  return { label: addon.status_label || SITE_ADDON_STATUS_LABEL[addon.status] || addon.status, tone: 'warning' };
}

/**
 * Status yang dinotakan (label + nada pill), untuk halaman nota. Fitur tambahan yang dinonaktifkan admin (revoked_at)
 * tetap punya nota, dengan status "Dinonaktifkan".
 */
export function invoiceStatusView(
  order: Order,
  renewal: Renewal | null | undefined,
  addon?: SiteAddonOrder | null,
): { label: string; tone: PaymentTone } {
  if (addon) return addon.revoked_at ? { label: 'Dinonaktifkan', tone: 'neutral' } : addonPaymentStatus(addon);
  return renewal ? renewalPaymentStatus(renewal) : invoiceStatus(order);
}

/** Status di nota: lunas biasa ditulis kapital seperti cap nota ("LUNAS"), selebihnya label pembeli apa adanya. */
export function invoicePaymentStatus(order: Order, renewal: Renewal | null | undefined, addon?: SiteAddonOrder | null): string {
  // Fitur yang dinonaktifkan tetap sudah dibayar: status pembayaran dari tagihannya, status fitur di baris sendiri
  const { label } = addon ? addonPaymentStatus(addon) : invoiceStatusView(order, renewal);
  return label === 'Lunas' ? 'LUNAS' : label;
}

/**
 * Rincian pembelian: template (harga katalog), diskon, domain tahun pertama. Pesanan dari sebelum domain dijual
 * terpisah (domain_price 0) mendapat catatan bahwa domain tahun pertama sudah termasuk harga template.
 */
function purchaseItems(order: Order, domain: string): { items: Item[]; note: string | null } {
  const domainPrice = num(order.domain_price);
  const discount = num(order.discount_amount);
  const listPrice = order.list_price != null ? num(order.list_price) : num(order.price) - domainPrice + discount;
  const items: Item[] = [[`Template website ${order.template_name} (setup awal, hosting & SSL 1 tahun)`, listPrice]];
  if (discount > 0) items.push(['Diskon pembelian pertama', -discount]);
  if (domainPrice > 0) items.push([`Domain ${domain} (1 tahun)`, domainPrice]);
  return { items, note: domainPrice > 0 ? null : 'Domain tahun pertama termasuk harga template.' };
}

/** Rincian fitur tambahan: satu baris "Fitur Berita & Pengumuman (domain)", sekali bayar. */
const addonItems = (addon: SiteAddonOrder, domain: string): Item[] => [
  [`Fitur ${SITE_ADDON_NAME[addon.addon_code] ?? addon.addon_code} (${domain})`, num(addon.price)],
];

/** Fitur tambahan: nama, masa berlaku (selama situs aktif), dan status (aktif / dinonaktifkan admin). */
const addonRows = (addon: SiteAddonOrder, domain: string): KeyValueRow[] => [
  row('Situs', domain),
  row('Fitur', SITE_ADDON_NAME[addon.addon_code] ?? addon.addon_code),
  row('Masa berlaku', 'Selama situs aktif (sekali bayar)'),
  row('Status fitur', addon.revoked_at ? `Dinonaktifkan sejak ${tanggal(addon.revoked_at)}` : 'Aktif'),
];

/** Rincian perpanjangan: hosting & jasa dan domain, masing-masing harga per tahun × jumlah tahun. */
function renewalItems(renewal: Renewal): Item[] {
  const years = Math.max(1, Math.round(num(renewal.years)));
  const items: Item[] = [[`Perpanjangan hosting & jasa template (${years} tahun)`, num(renewal.hosting_price_per_year) * years]];
  const domainPerYear = num(renewal.domain_price_per_year);
  if (domainPerYear > 0) items.push([`Perpanjangan domain ${renewal.domain} (${years} tahun)`, domainPerYear * years]);
  return items;
}

/**
 * Masa aktif yang dibayar pembelian: tahun pertama sejak situs aktif (perpanjangan punya notanya sendiri), atau
 * berakhir lebih awal bila tanggal berakhir yang tersimpan lebih dulu.
 */
function firstYear(started: string | null | undefined, expires: string | null | undefined, notStarted: string): string {
  const start = (started ?? '').slice(0, 10);
  const oneYear = tambahTahun(start, 1);
  if (!oneYear) return notStarted;
  const stored = tanggalPanjang(expires ?? '') ? (expires as string).slice(0, 10) : '';
  const end = stored && stored < oneYear ? stored : oneYear;
  return `${tanggal(start)} – ${tanggal(end)}`;
}

/** Masa aktif setelah perpanjangan: "Sampai 23 Oktober 2029 (sebelumnya 23 Oktober 2028)". */
function extended(before: string | null | undefined, after: string | null | undefined): string {
  if (!tanggalPanjang(after ?? '')) return '-';
  return tanggalPanjang(before ?? '') ? `Sampai ${tanggal(after)} (sebelumnya ${tanggal(before)})` : `Sampai ${tanggal(after)}`;
}

function periodRows(order: Order, renewal: Renewal | null, domain: string): KeyValueRow[] {
  if (renewal) {
    return [
      row('Domain', domain),
      row('Masa aktif hosting & jasa', extended(renewal.service_expires_before, renewal.service_expires_after)),
      row('Masa aktif domain', extended(renewal.domain_expires_before, renewal.domain_expires_after)),
    ];
  }
  const closed = order.status === 'ditolak' || order.status === 'dibatalkan';
  const notStarted = closed ? 'Tidak diaktifkan' : 'Dimulai saat situs aktif';
  return [
    row('Domain', domain),
    row('Masa aktif hosting & jasa', firstYear(order.service_started_at, order.service_expires_at, notStarted)),
    row('Masa aktif domain', firstYear(order.domain_started_at, order.domain_expires_at, notStarted)),
  ];
}

/** Data pemesan, satu baris per isian: nama (tebal), perusahaan, email, nomor HP. */
function billedTo(order: Order): TextRun[] {
  const rest = [order.company_name, order.customer_email, order.customer_phone].map((v) => (v ?? '').trim()).filter(Boolean);
  return [{ text: order.customer_name?.trim() || '-', bold: true }, ...(rest.length ? [{ text: `\n${rest.join('\n')}` }] : [])];
}

/** Judul halaman nota per jenis. */
export const invoiceTitleOf = (data: Pick<InvoiceData, 'renewal' | 'addon'>): string =>
  data.addon ? 'Nota fitur tambahan' : data.renewal ? 'Nota perpanjangan' : 'Nota pembelian';

/** Nota pembelian (renewal & addon kosong), nota perpanjangan, atau nota fitur tambahan sebagai DocModel. */
export function buildInvoiceModel({ order, renewal: renewalIn, addon: addonIn, company }: InvoiceData): DocModel {
  const addon = addonIn ?? null;
  const renewal = addon ? null : (renewalIn ?? null);
  const kop: CompanySettings = { ...EMPTY_COMPANY, ...(company ?? {}) };
  const number = invoiceNumberOf(order, renewal, addon);
  const title = invoiceTitleOf({ renewal, addon }).toUpperCase();
  const paidAt = (addon ? addon.paid_at : renewal ? renewal.paid_at : order.paid_at) ?? '';
  const paymentType = addon ? addon.payment_type : renewal ? renewal.payment_type : order.payment_type;
  const domain = (renewal ? renewal.domain : order.domain || order.domain_primary) || '-';
  const { items, note } = addon
    ? { items: addonItems(addon, domain), note: null }
    : renewal
      ? { items: renewalItems(renewal), note: null }
      : purchaseItems(order, domain);
  const total = num(addon ? addon.price : renewal ? renewal.price : order.price);
  const issuer = kop.name.trim() || 'Garuda Nexa';

  const info: KeyValueRow[] = [
    row('No. nota', number),
    row('No. pesanan', order.order_number),
    ...(renewal ? [row('No. perpanjangan', renewal.renewal_number)] : []),
    ...(addon ? [row('No. tagihan fitur', addon.addon_number)] : []),
    row('Tanggal nota', tanggal(paidAt)),
    row('Status pembayaran', [{ text: invoicePaymentStatus(order, renewal, addon), bold: true }]),
  ];

  const blocks: Block[] = [
    { type: 'heading', level: 1, text: title, align: 'center' },
    { type: 'spacer', size: 6 },
    { type: 'keyValue', rows: info },
    heading('Ditagihkan kepada'),
    { type: 'paragraph', runs: billedTo(order) },
    heading('Rincian pembayaran'),
    {
      type: 'table',
      columns: ['Uraian', 'Jumlah'],
      rows: [
        ...items.map(([label, amount]) => [plain(label), plain(formatRupiahDoc(amount))]),
        [[{ text: 'Total', bold: true }], [{ text: formatRupiahDoc(total), bold: true }]],
      ],
      align: ['left', 'right'],
      widths: [36, 12],
      total: true,
    },
    ...(note ? [{ type: 'paragraph', runs: [{ text: note, italic: true }], size: 'small' } satisfies Block] : []),
    { type: 'paragraph', runs: [{ text: 'Terbilang: ' }, { text: terbilang(total), italic: true }] },
    heading('Pembayaran'),
    { type: 'keyValue', rows: [row('Metode', paymentTypeLabel(paymentType)), row('Dibayar pada', waktuBayar(paidAt))] },
    heading(addon ? 'Fitur tambahan' : 'Domain & masa aktif'),
    { type: 'keyValue', rows: addon ? addonRows(addon, domain) : periodRows(order, renewal, domain) },
    { type: 'spacer', size: 14 },
    {
      type: 'paragraph',
      runs: plain(
        `Nota ini diterbitkan secara elektronik oleh ${issuer} dan sah tanpa tanda tangan.${
          NOT_MIDTRANS.has(paymentType ?? '') ? '' : ' Pembayaran diproses melalui Midtrans.'
        }`,
      ),
    },
  ];

  return {
    meta: { number, title, type: 'invoice', date: paidAt.slice(0, 10) },
    kop: { company: kop },
    blocks,
    signatures: [],
    footer: { text: number },
    missing: [],
  };
}
