// Ikon garis PayNow dipilih otomatis dari teks CMS (label fitur, jenis usaha, judul keamanan), jadi CMS tidak butuh
// kolom ikon. Aturan pertama yang cocok menang. Juga jenis layar mockup HP per fitur (QRIS / transfer / tagihan / isi
// saldo) dari label tab. Dirender lewat <AutoIcon> (./ui).
import {
  ArrowLeftRight,
  BellRing,
  BookOpen,
  Car,
  Citrus,
  Coffee,
  Fingerprint,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  Pill,
  Printer,
  QrCode,
  ReceiptText,
  Scissors,
  ShieldCheck,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Store,
  Utensils,
  WalletCards,
  Wrench,
  Zap,
} from 'lucide-react';
import type { ComponentType } from 'react';

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

/** Semua ikon otomatis. */
export const ICONS = {
  qris: QrCode,
  transfer: ArrowLeftRight,
  bill: ReceiptText,
  topup: WalletCards,
  bolt: Zap,
  phone: Smartphone,
  coffee: Coffee,
  food: Utensils,
  basket: ShoppingBasket,
  pill: Pill,
  wrench: Wrench,
  shirt: Shirt,
  scissors: Scissors,
  bag: ShoppingBag,
  school: GraduationCap,
  printer: Printer,
  fruit: Citrus,
  car: Car,
  book: BookOpen,
  store: Store,
  pin: KeyRound,
  fingerprint: Fingerprint,
  bell: BellRing,
  lock: LockKeyhole,
  shield: ShieldCheck,
} as const satisfies Record<string, Icon>;

export type IconKey = keyof typeof ICONS;

const pick = (rules: [RegExp, IconKey][], value: string, fallback: IconKey): IconKey =>
  rules.find(([pattern]) => pattern.test(value || ''))?.[1] ?? fallback;

// Fitur pembayaran (tombol aksi di HP hero, tab fitur, ikon transaksi)
const PAYMENT: [RegExp, IconKey][] = [
  [/qris|qr\b|scan|pindai/i, 'qris'],
  [/transfer|kirim|terima uang|uang masuk/i, 'transfer'],
  [/top.?up|isi saldo|saldo/i, 'topup'],
  [/listrik|token/i, 'bolt'],
  [/tagihan|\bbill|\bair\b|internet|bpjs/i, 'bill'],
  [/pulsa|paket data/i, 'phone'],
  [/kopi|kafe|cafe/i, 'coffee'],
  [/makan|resto|warung/i, 'food'],
];

/** Ikon fitur pembayaran dari label/judul; tanpa kecocokan → dompet. */
export const paymentIcon = (label: string): IconKey => pick(PAYMENT, label, 'topup');

// Jenis usaha (strip kepercayaan)
const BUSINESS: [RegExp, IconKey][] = [
  [/kopi|kafe|cafe/i, 'coffee'],
  [/makan|warung|resto|kantin|kuliner|katering/i, 'food'],
  [/kelontong|minimarket|sembako|grosir/i, 'basket'],
  [/apotek|obat|klinik/i, 'pill'],
  [/bengkel|servis|service|cuci motor|cuci mobil/i, 'wrench'],
  [/laundry|binatu|pakaian|butik|fashion/i, 'shirt'],
  [/salon|barber|cukur|spa/i, 'scissors'],
  [/online|e-?commerce|marketplace/i, 'bag'],
  [/sekolah|kursus|les\b|pendidikan|bimbel/i, 'school'],
  [/cetak|percetakan|fotokopi/i, 'printer'],
  [/buah|sayur|pasar/i, 'fruit'],
  [/parkir|ojek|transport|travel/i, 'car'],
  [/buku|toko buku/i, 'book'],
];

/** Ikon jenis usaha; tanpa kecocokan → toko. */
export const businessIcon = (label: string): IconKey => pick(BUSINESS, label, 'store');

// Fitur keamanan
const SECURITY: [RegExp, IconKey][] = [
  [/pin|kata sandi|password|kode/i, 'pin'],
  [/biometrik|sidik|wajah|face|finger/i, 'fingerprint'],
  [/notifikasi|pemberitahuan|real.?time|peringatan/i, 'bell'],
  [/enkripsi|encrypt|kunci|aman/i, 'lock'],
];

/** Ikon fitur keamanan; tanpa kecocokan → perisai. */
export const securityIcon = (title: string): IconKey => pick(SECURITY, title, 'shield');

export type ScreenKind = 'qris' | 'transfer' | 'bill' | 'topup' | 'generic';

const SCREENS: [RegExp, ScreenKind][] = [
  [/qris|qr\b|scan|pindai/i, 'qris'],
  [/transfer|kirim/i, 'transfer'],
  [/tagihan|\bbill|listrik|\bair\b|internet/i, 'bill'],
  [/top.?up|isi saldo|saldo/i, 'topup'],
];

/** Tampilan layar HP untuk tab fitur dari labelnya (QRIS → bingkai pindai, Transfer → penerima, dst.). */
export const screenKind = (label: string): ScreenKind => SCREENS.find(([pattern]) => pattern.test(label || ''))?.[1] ?? 'generic';
